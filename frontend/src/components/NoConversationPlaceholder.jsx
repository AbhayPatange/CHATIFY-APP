import Logo from "./Logo";
import MessageStatus from "./MessageStatus";

const TICKS = [
  { status: "sent", label: "Sent to the server" },
  { status: "delivered", label: "Delivered to their device" },
  { status: "seen", label: "Seen" },
];

const NoConversationPlaceholder = () => (
  <div className="flex h-full flex-col items-center justify-center border-b-[6px] border-pl-accent bg-pl-header/60 p-8 text-center">
    <Logo className="mb-6 size-24" />
    <h3 className="mb-2 text-3xl font-light text-pl-text">Pinglet</h3>
    <p className="max-w-md text-sm leading-relaxed text-pl-muted">
      Send and receive messages in real time. Pick a chat from the list, or find someone in Contacts to start a new one.
    </p>

    <ul className="mt-8 space-y-2 text-sm text-pl-muted">
      {TICKS.map((t) => (
        <li key={t.status} className="flex items-center justify-center gap-3">
          <MessageStatus status={t.status} className="text-pl-muted" size={18} />
          <span>{t.label}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default NoConversationPlaceholder;
