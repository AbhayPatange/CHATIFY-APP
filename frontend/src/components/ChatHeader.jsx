import { useEffect, useState } from "react";
import { ArrowLeftIcon, Clock3Icon, PhoneIcon, VideoIcon, XIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import Avatar from "./Avatar";
import { useCallStore } from "../store/useCallStore";

function ChatHeader() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const setProfileUser = useChatStore((s) => s.setProfileUser);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const isOnline = onlineUsers.includes(selectedUser._id);
  const startCall = useCallStore((state) => state.start);
  const toggleCallHistory = useCallStore((state) => state.toggleCallHistory);
  const [pendingCall, setPendingCall] = useState(null);
  const requestCall = (kind) => {
    if (!isOnline) {
      toast.error(`${selectedUser.fullName} is offline. They need to be signed in before you can call.`);
      return;
    }
    setPendingCall(kind);
  };
  const confirmCall = () => {
    const kind = pendingCall;
    setPendingCall(null);
    startCall(selectedUser._id, kind);
  };

  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === "Escape") setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEscKey);
    return () => window.removeEventListener("keydown", handleEscKey);
  }, [setSelectedUser]);

  return <>
    <header className="relative z-10 flex h-[72px] shrink-0 items-center gap-2 border-b border-pl-line bg-pl-header/90 px-2 shadow-sm md:px-5">
      {/* back arrow on phones, where the chat list is hidden while a chat is open */}
      <button
        onClick={() => setSelectedUser(null)}
        aria-label="Back to chats"
        className="grid size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected hover:text-pl-text md:hidden"
      >
        <ArrowLeftIcon className="size-5" />
      </button>

      <button type="button" onClick={() => setProfileUser(selectedUser)} aria-label={`View ${selectedUser.fullName} profile`} className="rounded-full"><Avatar src={selectedUser.profilePic} name={selectedUser.fullName} size="size-11" online={isOnline} /></button>

      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setProfileUser(selectedUser)}>
        <h3 className="truncate text-base text-pl-text">{selectedUser.fullName}</h3>
        <p className={`text-xs ${isOnline ? "text-pl-accent" : "text-pl-muted"}`}>{isOnline ? "online" : "offline"}</p>
      </div>

      <button type="button" onClick={toggleCallHistory} aria-label="Call history" title="Call history" className="grid size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected hover:text-pl-text"><Clock3Icon className="size-5" /></button>
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
    {pendingCall && <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="call-permission-title">
      <div className="w-full max-w-sm rounded-2xl bg-pl-panel p-5 text-pl-text shadow-2xl">
        <h2 id="call-permission-title" className="text-lg font-semibold">Allow {pendingCall === "video" ? "camera and microphone" : "microphone"}?</h2>
        <p className="mt-2 text-sm text-pl-muted">Pinglet will ask your browser for permission so you can {pendingCall === "video" ? "join a video call" : "start a voice call"}.</p>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" onClick={() => setPendingCall(null)} className="rounded-lg px-4 py-2 text-sm text-pl-muted hover:bg-pl-selected hover:text-pl-text">Cancel</button>
          <button type="button" onClick={confirmCall} className="rounded-lg bg-pl-accent px-4 py-2 text-sm font-medium text-pl-bg hover:opacity-90">Continue</button>
        </div>
      </div>
    </div>}
  </>;
}
export default ChatHeader;
