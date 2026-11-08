import { useEffect, useMemo } from "react";
import { CameraIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { formatListTime } from "../lib/time";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import NoChatsFound from "./NoChatsFound";
import Avatar from "./Avatar";
import MessageStatus from "./MessageStatus";

function ChatsList() {
  const getMyChatPartners = useChatStore((s) => s.getMyChatPartners);
  const chats = useChatStore((s) => s.chats);
  const isUsersLoading = useChatStore((s) => s.isUsersLoading);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const selectedUser = useChatStore((s) => s.selectedUser);
  const unread = useChatStore((s) => s.unread);
  const activeTab = useChatStore((s) => s.activeTab);
  const search = useChatStore((s) => s.search);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const myId = useAuthStore((s) => s.authUser?._id);

  useEffect(() => {
    getMyChatPartners();
  }, [getMyChatPartners]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return chats.filter(
      (c) =>
        (activeTab !== "unread" || unread[c._id] > 0) &&
        (!term || c.fullName.toLowerCase().includes(term))
    );
  }, [chats, activeTab, unread, search]);

  if (isUsersLoading && chats.length === 0) return <UsersLoadingSkeleton />;
  if (chats.length === 0) return <NoChatsFound />;
  if (visible.length === 0) {
    return (
      <p className="px-6 py-10 text-center text-sm text-pl-muted">
        {search ? `No chats match “${search.trim()}”.` : "No unread chats."}
      </p>
    );
  }

  return (
    <ul>
      {visible.map((chat) => {
        const last = chat.lastMessage;
        const count = unread[chat._id] || 0;
        const mine = last && last.senderId === myId;
        const isOpen = selectedUser?._id === chat._id;

        return (
          <li key={chat._id}>
            <button
              type="button"
              aria-current={isOpen}
              onClick={() => setSelectedUser(chat)}
              className={`flex w-full items-center gap-3 pl-3 text-left transition-colors hover:bg-pl-hover ${
                isOpen ? "bg-pl-selected" : ""
              }`}
            >
              <Avatar src={chat.profilePic} name={chat.fullName} size="size-[49px]" online={onlineUsers.includes(chat._id)} />

              <div className="min-w-0 flex-1 border-b border-pl-line py-3 pr-3">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="truncate text-[17px] text-pl-text">{chat.fullName}</h4>
                  {last && (
                    <time
                      dateTime={last.createdAt}
                      className={`shrink-0 text-xs ${count > 0 ? "text-pl-accent" : "text-pl-muted"}`}
                    >
                      {formatListTime(last.createdAt)}
                    </time>
                  )}
                </div>

                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-1 text-sm text-pl-muted">
                    {mine && <MessageStatus status={last.status} className="text-pl-muted" size={16} />}
                    {last?.hasImage && <CameraIcon className="size-4 shrink-0" aria-hidden />}
                    <span className="truncate">{last?.text || (last?.hasImage ? "Photo" : "")}</span>
                  </p>

                  {count > 0 && (
                    <span
                      className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-pl-accent px-1.5 text-xs font-semibold text-pl-bg"
                      aria-label={`${count} unread messages`}
                    >
                      {count > 99 ? "99+" : count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
export default ChatsList;
