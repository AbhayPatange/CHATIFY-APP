import { Clock3Icon, PhoneCallIcon, VideoIcon, XIcon } from "lucide-react";
import { useCallStore } from "../store/useCallStore";

const formatDate = (value) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default function CallHistoryPanel() {
  const { isHistoryOpen, callHistory, closeCallHistory } = useCallStore();
  if (!isHistoryOpen) return null;
  return <div className="fixed inset-0 z-40 flex justify-end bg-black/40" role="dialog" aria-modal="true" aria-label="Call history">
    <section className="h-full w-full max-w-md overflow-y-auto bg-pl-panel p-5 text-pl-text shadow-2xl">
      <div className="mb-5 flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Clock3Icon className="size-5 text-pl-accent" /> Call history</h2><button type="button" onClick={closeCallHistory} aria-label="Close call history" className="text-pl-muted hover:text-pl-text"><XIcon /></button></div>
      {callHistory.length === 0 ? <p className="text-sm text-pl-muted">Calls made from this device will appear here.</p> : <ul className="space-y-2">{callHistory.map((call) => <li key={call.id} className="rounded-xl bg-pl-selected p-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-full bg-pl-accent/15 text-pl-accent">{call.kind === "video" ? <VideoIcon className="size-4" /> : <PhoneCallIcon className="size-4" />}</div><div className="min-w-0 flex-1"><p className="capitalize">{call.direction} {call.kind} call</p><p className="text-xs text-pl-muted">{formatDate(call.startedAt)}{call.endedAt ? " · ended" : " · ongoing"}</p></div></div></li>)}</ul>}
    </section>
  </div>;
}
