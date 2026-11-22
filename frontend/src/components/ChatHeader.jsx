import { useEffect } from "react";
import { ArrowLeftIcon, PhoneIcon, VideoIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Avatar from "./Avatar";
import { useCallStore } from "../store/useCallStore";

function ChatHeader() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const isOnline = onlineUsers.includes(selectedUser._id);
  const startCall = useCallStore((state) => state.start);
  const requestCall = (kind) => {
    if (!isOnline) {
      toast.error(`${selectedUser.fullName} is offline. They need to be signed in before you can call.`);
      return;
    }
    startCall(selectedUser._id, kind);
  };

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 bg-pl-header px-2 md:px-4">
      {/* back arrow on phones, where the chat list is hidden while a chat is open */}
      <button
        onClick={() => setSelectedUser(null)}
        aria-label="Back to chats"
        className="grid size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected hover:text-pl-text md:hidden"
      >
        <ArrowLeftIcon className="size-5" />
      </button>

      <Avatar src={selectedUser.profilePic} name={selectedUser.fullName} size="size-10" online={isOnline} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-base text-pl-text">{selectedUser.fullName}</h3>
        <p className={`text-xs ${isOnline ? "text-pl-accent" : "text-pl-muted"}`}>{isOnline ? "online" : "offline"}</p>
      </div>

      <button type="button" onClick={() => requestCall("audio")} aria-label="Start voice call" title={isOnline ? "Voice call" : "User is offline"} className="grid size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected hover:text-pl-text"><PhoneIcon className="size-5" /></button>
      <button type="button" onClick={() => requestCall("video")} aria-label="Start video call" title={isOnline ? "Video call" : "User is offline"} className="grid size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected hover:text-pl-text"><VideoIcon className="size-5" /></button>

      <button
        onClick={() => setSelectedUser(null)}
        aria-label="Close conversation"
        title="Close chat (Esc)"
        className="hidden size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected hover:text-pl-text md:grid"
      >
        <XIcon className="size-5" />
      </button>
    </header>
  );
}
export default ChatHeader;
