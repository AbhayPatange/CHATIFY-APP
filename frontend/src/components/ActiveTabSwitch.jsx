import { SearchIcon, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const TABS = [
  { id: "chats", label: "All chats" },
  { id: "unread", label: "Unread" },
  { id: "contacts", label: "Connections" },
];

function ActiveTabSwitch() {
  const activeTab = useChatStore((s) => s.activeTab);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const search = useChatStore((s) => s.search);
  const setSearch = useChatStore((s) => s.setSearch);

  return (
    <div className="shrink-0 space-y-4 border-b border-pl-line px-5 pb-5 pt-2">
      <h1 className="text-4xl font-bold tracking-[-0.055em] text-pl-text">Inbox</h1>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pl-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === "contacts" ? "Search connections" : "Search chats"}
          aria-label="Search"
          className="w-full rounded-xl border border-pl-line bg-pl-header py-3 pl-10 pr-9 text-sm text-pl-text placeholder-pl-muted focus:outline-none focus:ring-1 focus:ring-pl-accent"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-pl-muted hover:text-pl-text"
          >
            <XIcon className="size-4" />
          </button>
        )}
      </div>

      <div className="flex gap-1 rounded-2xl bg-pl-bg p-1" role="tablist" aria-label="Chat filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-11 flex-1 rounded-xl px-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-pl-accent text-pl-bg"
                : "text-pl-muted hover:bg-pl-selected"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
export default ActiveTabSwitch;
