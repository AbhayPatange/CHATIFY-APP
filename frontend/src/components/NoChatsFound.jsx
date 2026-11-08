import { useChatStore } from "../store/useChatStore";

function NoChatsFound() {
  const setActiveTab = useChatStore((s) => s.setActiveTab);

  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <h4 className="mb-1 text-pl-text">No chats yet</h4>
      <p className="mb-4 text-sm text-pl-muted">Pick someone from Contacts to start your first conversation.</p>
      <button
        onClick={() => setActiveTab("contacts")}
        className="rounded-full bg-pl-accent px-5 py-2 text-sm font-medium text-pl-bg transition-colors hover:bg-[#06cf9c]"
      >
        Find contacts
      </button>
    </div>
  );
}
export default NoChatsFound;
