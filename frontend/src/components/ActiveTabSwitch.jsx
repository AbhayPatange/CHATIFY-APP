import { SearchIcon, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";

const TABS = [
  { id: "chats", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "contacts", label: "Contacts" },
];

function ActiveTabSwitch() {
  const activeTab = useChatStore((s) => s.activeTab);
  const setActiveTab = useChatStore((s) => s.setActiveTab);
  const search = useChatStore((s) => s.search);
  const setSearch = useChatStore((s) => s.setSearch);

  return (
    <div className="shrink-0 space-y-2 border-b border-pl-line px-3 py-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-pl-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={activeTab === "contacts" ? "Search contacts" : "Search chats"}
          aria-label="Search"
          className="w-full rounded-lg bg-pl-header py-2 pl-10 pr-9 text-sm text-pl-text placeholder-pl-muted focus:outline-none focus:ring-1 focus:ring-pl-accent"
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

      <div className="flex gap-2" role="tablist" aria-label="Chat filters">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              activeTab === tab.id
                ? "bg-[#103529] text-pl-accent"
                : "bg-pl-header text-pl-muted hover:bg-pl-selected"
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
