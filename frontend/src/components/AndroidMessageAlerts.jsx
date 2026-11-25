import { useEffect } from "react";
import toast from "react-hot-toast";
import { android, alerts, configureAlerts, notificationPreference } from "../lib/alerts";
import { decryptText } from "../lib/crypto";
import { axiosInstance, getErrorMessage } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";

if (android) {
  useAuthStore.subscribe((state, previous) => {
    if (previous.authUser && previous.authUser._id !== state.authUser?._id) alerts.disable().catch(() => {});
  });
}

export default function AndroidMessageAlerts() {
  const owner = useAuthStore(s => s.authUser?._id);
  const socket = useAuthStore(s => s.socket);
  useEffect(() => {
    if (!android || !owner) return;
    let mounted = true;
    async function handleAction() {
      if (!mounted) return;
      const action = await alerts.takeAction();
      if (action.owner !== owner || !action.peer || useAuthStore.getState().authUser?._id !== owner) return;
      try {
        const chat = useChatStore.getState();
        if (action.action === "read") {
          await axiosInstance.put("/messages/seen/" + action.peer);
          await chat.getMyChatPartners({ silent: true });
        } else {
          const { data } = await axiosInstance.get("/connections");
          const partner = data.connected.find(person => person._id === action.peer);
          if (!partner || useAuthStore.getState().authUser?._id !== owner) return;
          chat.setSelectedUser(partner);
          if (action.action === "reply" && action.text) {
            chat.setReplyTo(null);
            const sent = await chat.sendMessage({ text: action.text });
            if (!sent) {
              useChatStore.setState({ notificationDraft: { peer: partner._id, text: action.text } });
              return;
            }
          }
        }
        await alerts.clear({ peer: action.peer });
      } catch (error) { toast.error(getErrorMessage(error)); }
    }
    const listener = alerts.addListener("action", () => handleAction().catch(() => {}));
    // Deferring lets the development StrictMode cleanup finish before requesting permission.
    const timer = setTimeout(async () => {
      try {
        const pref = notificationPreference(owner);
        if (pref !== "off") await configureAlerts(owner, pref === null);
        if (mounted) await handleAction();
      } catch { /* Android settings remain available if the OS suppresses a prompt. */ }
    }, 0);
    return () => { mounted = false; clearTimeout(timer); listener.then(l => l.remove()).catch(() => {}); };
  }, [owner]);

  useEffect(() => {
    if (!android || !socket || !owner) return;
    async function onIncoming(message) {
      if (notificationPreference(owner) !== "on") return;
      const chat = useChatStore.getState();
      if (document.visibilityState === "visible" && chat.selectedUser?._id === message.senderId) return;
      const person = chat.chats.find(p => p._id === message.senderId) || chat.allContacts.find(p => p._id === message.senderId);
      let preview = "New message";
      const identity = useAuthStore.getState().encryptionIdentity;
      if (message.encrypted && identity) {
        try {
          const content = await decryptText(message, owner, identity);
          if (message.documentId) preview = "Document";
          else if (message.photoId) preview = content || "Photo";
          else preview = content || "New message";
        } catch { /* Keep the generic notification if the key is unavailable. */ }
      } else if (message.text) preview = message.text;
      if (useAuthStore.getState().authUser?._id !== owner) return;
      alerts.post({ owner, preview,  peer: message.senderId, name: person?.fullName || "Pinglet", latest: message._id,
        count: (chat.unread[message.senderId] || 0) + 1 }).catch(() => {});
    }
    const onRead = ({ partnerId }) => alerts.clear({ peer: partnerId }).catch(() => {});
    socket.on("newMessage", onIncoming); socket.on("chatRead", onRead);
    return () => { socket.off("newMessage", onIncoming); socket.off("chatRead", onRead); };
  }, [socket, owner]);
  return null;
}
