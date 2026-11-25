import { MessageCircleMore, Sparkle } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

export default function NoConversationPlaceholder() {
  const setActiveTab = useChatStore((state) => state.setActiveTab);

  return (
    <div className="chat-wallpaper flex h-full flex-col items-center justify-center px-8 text-center">
      <div aria-hidden="true" className="relative mb-8 h-28 w-44">
        <div className="absolute left-3 top-2 flex h-16 w-24 -rotate-12 items-center justify-center rounded-[26px] rounded-bl-md bg-pl-blue text-pl-bg shadow-lg">
          <MessageCircleMore size={35} strokeWidth={2} />
        </div>
        <div className="absolute bottom-1 right-2 flex h-16 w-24 rotate-6 items-center justify-center gap-1.5 rounded-[26px] rounded-br-md bg-pl-accent shadow-lg">
          {[0, 1, 2].map((dot) => <span key={dot} className="size-2 rounded-full bg-pl-bg" />)}
        </div>
        <Sparkle className="absolute right-2 top-0 size-6 text-pl-blue" />
      </div>
      <h2 className="text-4xl font-bold tracking-[-0.055em] text-pl-text">Your conversations</h2>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-pl-muted">Open a chat from your inbox or choose a connection to start one.</p>
      <button type="button" onClick={() => setActiveTab("contacts")} className="mt-6 rounded-full border border-pl-line bg-pl-panel px-5 py-3 text-sm font-semibold text-pl-blue hover:bg-pl-hover">
        Browse connections
      </button>
    </div>
  );
}
