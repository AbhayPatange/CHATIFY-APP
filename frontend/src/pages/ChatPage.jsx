import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";

import ProfileHeader from "../components/ProfileHeader";
import ActiveTabSwitch from "../components/ActiveTabSwitch";
import ChatsList from "../components/ChatsList";
import ContactList from "../components/ContactList";
import ChatContainer from "../components/ChatContainer";
import NoConversationPlaceholder from "../components/NoConversationPlaceholder";

function ChatPage() {
  const activeTab = useChatStore((s) => s.activeTab);
  const selectedUser = useChatStore((s) => s.selectedUser);
  const unread = useChatStore((s) => s.unread);
  const subscribeToMessages = useChatStore((s) => s.subscribeToMessages);
  const unsubscribeFromMessages = useChatStore((s) => s.unsubscribeFromMessages);
  const socket = useAuthStore((s) => s.socket);

  // One page-level subscription: messages from *any* user are handled, not only the open chat.
  useEffect(() => {
    subscribeToMessages();
    return () => unsubscribeFromMessages();
  }, [socket, subscribeToMessages, unsubscribeFromMessages]);

  // "(3) Pinglet" in the browser tab while there are unread messages
  const totalUnread = Object.values(unread).reduce((sum, n) => sum + n, 0);
  useEffect(() => {
    document.title = totalUnread > 0 ? `(${totalUnread > 99 ? "99+" : totalUnread}) Pinglet` : "Pinglet";
    return () => {
      document.title = "Pinglet";
    };
  }, [totalUnread]);

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[1600px] overflow-hidden bg-pl-panel xl:my-5 xl:h-[calc(100dvh-2.5rem)] xl:rounded-lg xl:shadow-2xl">
      {/* LEFT: on phones it is hidden while a conversation is open */}
      <aside
        className={`${
          selectedUser ? "hidden md:flex" : "flex"
        } w-full shrink-0 flex-col border-r border-pl-line bg-pl-panel md:w-[360px] lg:w-[400px]`}
      >
        <ProfileHeader />
        <ActiveTabSwitch />
        <nav aria-label="Conversations" className="flex-1 overflow-y-auto">
          {activeTab === "contacts" ? <ContactList /> : <ChatsList />}
        </nav>
      </aside>

      {/* RIGHT */}
      <section className={`${selectedUser ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-pl-bg`}>
        {selectedUser ? <ChatContainer /> : <NoConversationPlaceholder />}
      </section>
    </div>
  );
}
export default ChatPage;
