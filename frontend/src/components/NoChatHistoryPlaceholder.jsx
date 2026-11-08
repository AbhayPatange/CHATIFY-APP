import { useChatStore } from "../store/useChatStore";

const QUICK_MESSAGES = ["👋 Say hello", "🤝 How are you?", "📅 Meet up soon?"];

const NoChatHistoryPlaceholder = ({ name }) => {
  const sendMessage = useChatStore((s) => s.sendMessage);
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <p className="mb-4 max-w-xs rounded-lg bg-pl-chip px-4 py-2 text-sm text-pl-muted shadow-sm">
        No messages with {name} yet. Say hi!
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {QUICK_MESSAGES.map((msg) => (
          <button
            key={msg}
            type="button"
            onClick={() => sendMessage({ text: msg })}
            className="rounded-full bg-pl-header px-4 py-2 text-sm text-pl-accent transition-colors hover:bg-pl-selected"
          >
            {msg}
          </button>
        ))}
      </div>
    </div>
  );
};

export default NoChatHistoryPlaceholder;
