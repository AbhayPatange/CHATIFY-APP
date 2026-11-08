import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance, getErrorMessage } from "../lib/axios";
import { readBool, writeBool } from "../lib/storage";
import { useAuthStore } from "./useAuthStore";

export const PAGE_SIZE = 50;

// pending (clock) -> sent (1 tick) -> delivered (2 ticks) -> seen (2 blue ticks)
const RANK = { pending: 0, sent: 1, delivered: 2, seen: 3 };
const rank = (status) => RANK[status] ?? RANK.seen; // messages from before ticks existed count as seen

const initialState = {
  allContacts: [],
  chats: [], // each: user + { lastMessage, unreadCount }
  messages: [],
  hasMoreMessages: false,
  isLoadingOlder: false,
  unread: {}, // { [userId]: count }
  search: "",
  activeTab: "chats", // chats | unread | contacts
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,
};

let notificationAudio = null;
const playNotification = () => {
  if (!notificationAudio) notificationAudio = new Audio("/sounds/notification.mp3");
  notificationAudio.currentTime = 0;
  notificationAudio.play().catch(() => {
    /* autoplay blocked until the user interacts: ignore */
  });
};

const toPreview = (m) => ({
  _id: m._id,
  senderId: m.senderId,
  text: m.text,
  hasImage: Boolean(m.image),
  status: m.status || "sent",
  createdAt: m.createdAt,
});

export const useChatStore = create((set, get) => ({
  ...initialState,
  isSoundEnabled: readBool("isSoundEnabled", false),

  // called on logout so the next user starts clean
  reset: () => set({ ...initialState }),

  toggleSound: () => {
    const next = !get().isSoundEnabled;
    writeBool("isSoundEnabled", next);
    set({ isSoundEnabled: next });
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearch: (search) => set({ search }),

  setSelectedUser: (selectedUser) => {
    const current = get().selectedUser;
    if (selectedUser && current?._id === selectedUser._id) return; // same chat: keep what's loaded

    const unread = { ...get().unread };
    if (selectedUser) delete unread[selectedUser._id];
    // clear immediately so the previous conversation never flashes in the new one
    set({ selectedUser, messages: [], hasMoreMessages: false, unread });
  },

  getAllContacts: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/contacts");
      set({ allContacts: res.data });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // silent: refresh in the background without showing the loading skeleton
  getMyChatPartners: async ({ silent = false } = {}) => {
    if (!silent) set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/messages/chats");
      const openId = get().selectedUser?._id;
      const unread = { ...get().unread };
      for (const chat of res.data) unread[chat._id] = chat._id === openId ? 0 : chat.unreadCount || 0;
      set({ chats: res.data, unread });
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error));
    } finally {
      if (!silent) set({ isUsersLoading: false });
    }
  },

  getMessagesByUserId: async (userId, { silent = false } = {}) => {
    if (!silent) set({ isMessagesLoading: true });
    try {
      const res = await axiosInstance.get(`/messages/${userId}`, { params: { limit: PAGE_SIZE } });
      // the user may have switched conversations while this request was in flight
      if (get().selectedUser?._id !== userId) return;
      set({ messages: res.data, hasMoreMessages: res.data.length >= PAGE_SIZE });
    } catch (error) {
      if (!silent) toast.error(getErrorMessage(error));
    } finally {
      if (!silent && get().selectedUser?._id === userId) set({ isMessagesLoading: false });
    }
  },

  loadOlderMessages: async () => {
    const { selectedUser, messages, isLoadingOlder, hasMoreMessages } = get();
    if (!selectedUser || isLoadingOlder || !hasMoreMessages) return;

    const oldest = messages.find((m) => !m.isOptimistic);
    if (!oldest) return;

    set({ isLoadingOlder: true });
    try {
      const res = await axiosInstance.get(`/messages/${selectedUser._id}`, {
        params: { limit: PAGE_SIZE, before: oldest.createdAt },
      });
      if (get().selectedUser?._id !== selectedUser._id) return;
      const existing = new Set(get().messages.map((m) => m._id));
      set({
        messages: [...res.data.filter((m) => !existing.has(m._id)), ...get().messages],
        hasMoreMessages: res.data.length >= PAGE_SIZE,
      });
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      set({ isLoadingOlder: false });
    }
  },

  sendMessage: async (messageData) => {
    const { selectedUser } = get();
    const { authUser } = useAuthStore.getState();
    if (!selectedUser || !authUser) return false;

    const receiverId = selectedUser._id;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // show the message immediately (clock icon); it is swapped for the server copy below
    const optimistic = {
      _id: tempId,
      senderId: authUser._id,
      receiverId,
      text: messageData.text,
      image: messageData.image,
      status: "pending",
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    };
    set((s) => ({ messages: [...s.messages, optimistic] }));
    bumpChat(receiverId, optimistic);

    try {
      const res = await axiosInstance.post(`/messages/send/${receiverId}`, messageData);
      // a "seen" event can beat the HTTP response: keep whichever status is further along
      const early = earlyStatus.get(res.data._id);
      earlyStatus.delete(res.data._id);
      const saved = early && rank(early) > rank(res.data.status) ? { ...res.data, status: early } : res.data;

      // functional updates + id matching: never overwrite messages that arrived in the meantime
      set((s) => ({ messages: s.messages.map((m) => (m._id === tempId ? saved : m)) }));
      if (!bumpChat(receiverId, saved)) get().getMyChatPartners({ silent: true });
      return true;
    } catch (error) {
      set((s) => ({ messages: s.messages.filter((m) => m._id !== tempId) }));
      get().getMyChatPartners({ silent: true }); // restores the previous preview
      toast.error(getErrorMessage(error));
      return false;
    }
  },

  /** Tell the server I have read what the open chat's partner sent -> their ticks turn blue. */
  markChatSeen: async () => {
    const { selectedUser, messages } = get();
    if (!selectedUser || document.visibilityState !== "visible" || markingSeen) return;

    const partnerId = selectedUser._id;
    // snapshot of what is on screen right now: these are the messages this request covers
    const unseenIds = messages
      .filter((m) => m.senderId === partnerId && rank(m.status) < RANK.seen)
      .map((m) => m._id);
    if (unseenIds.length === 0) return;

    markingSeen = true;
    let ok = false;
    try {
      await axiosInstance.put(`/messages/seen/${partnerId}`);
      // flip only the snapshot: a message that lands while the request is in flight stays
      // "unseen" locally and is picked up by the follow-up call below.
      // (Using the snapshot, not the server's reply, also means a chat already read on
      // another device can never make this loop.)
      const done = new Set(unseenIds);
      set((s) => ({
        messages: s.messages.map((m) => (done.has(m._id) ? { ...m, status: "seen" } : m)),
        unread: { ...s.unread, [partnerId]: 0 },
      }));
      ok = true;
    } catch {
      /* retried on the next incoming message / tab focus */
    } finally {
      markingSeen = false;
    }
    if (ok) get().markChatSeen(); // no-op unless something new arrived meanwhile
  },

  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    unsubscribeFromSocket(socket);
    socket.on("newMessage", handleNewMessage);
    socket.on("messagesDelivered", handleDelivered);
    socket.on("messagesSeen", handleSeen);
    socket.on("chatRead", handleChatRead);
    socket.io.on("reconnect", handleReconnect);
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (socket) unsubscribeFromSocket(socket);
  },
}));

// ---------------------------------------------------------------------------
// helpers + socket handlers (module-level, so they always read fresh state)
// ---------------------------------------------------------------------------

let markingSeen = false;
// status updates that arrive for a message whose HTTP response hasn't landed yet
const earlyStatus = new Map();

function unsubscribeFromSocket(socket) {
  socket.off("newMessage", handleNewMessage);
  socket.off("messagesDelivered", handleDelivered);
  socket.off("messagesSeen", handleSeen);
  socket.off("chatRead", handleChatRead);
  socket.io.off("reconnect", handleReconnect);
}

/** Show `message` as the chat's preview and move that chat to the top. false if it isn't listed yet. */
function bumpChat(partnerId, message) {
  const { chats } = useChatStore.getState();
  const existing = chats.find((c) => c._id === partnerId);
  if (!existing) return false;
  useChatStore.setState({
    chats: [{ ...existing, lastMessage: toPreview(message) }, ...chats.filter((c) => c._id !== partnerId)],
  });
  return true;
}

/** Statuses only ever move forward (sent -> delivered -> seen). */
function applyStatus(ids, status) {
  const wanted = new Set(ids);
  const known = new Set();

  useChatStore.setState((s) => ({
    messages: s.messages.map((m) => {
      if (!wanted.has(m._id)) return m;
      known.add(m._id);
      return rank(status) > rank(m.status) ? { ...m, status } : m;
    }),
    chats: s.chats.map((c) => {
      const last = c.lastMessage;
      if (!last || !wanted.has(last._id)) return c;
      known.add(last._id);
      return rank(status) > rank(last.status) ? { ...c, lastMessage: { ...last, status } } : c;
    }),
  }));

  for (const id of ids) {
    if (!known.has(id) && rank(status) > (RANK[earlyStatus.get(id)] ?? -1)) {
      if (earlyStatus.size > 200) earlyStatus.clear();
      earlyStatus.set(id, status);
    }
  }
}

function handleDelivered({ ids }) {
  applyStatus(ids, "delivered");
}

function handleSeen({ ids }) {
  applyStatus(ids, "seen");
}

// I read this chat on another device/tab: clear the badge here too
function handleChatRead({ partnerId }) {
  const { unread, chats } = useChatStore.getState();
  useChatStore.setState({
    unread: { ...unread, [partnerId]: 0 },
    chats: chats.map((c) => (c._id === partnerId ? { ...c, unreadCount: 0 } : c)),
  });
}

function handleNewMessage(message) {
  const state = useChatStore.getState();
  const fromOpenChat = state.selectedUser?._id === message.senderId;

  if (fromOpenChat) {
    if (!state.messages.some((m) => m._id === message._id)) {
      useChatStore.setState({ messages: [...state.messages, message] });
    }
    // chat is open and visible: it is read right away (blue ticks on the sender's side)
    useChatStore.getState().markChatSeen();
  } else {
    useChatStore.setState({
      unread: { ...state.unread, [message.senderId]: (state.unread[message.senderId] || 0) + 1 },
    });
  }

  // someone new wrote to us: make sure they show up in the chats list
  if (!bumpChat(message.senderId, message)) state.getMyChatPartners({ silent: true });

  if (state.isSoundEnabled) playNotification();
}

// messages sent while we were offline are fetched again after reconnecting
function handleReconnect() {
  const { selectedUser, getMessagesByUserId, getMyChatPartners } = useChatStore.getState();
  getMyChatPartners({ silent: true });
  if (selectedUser) getMessagesByUserId(selectedUser._id, { silent: true });
}
