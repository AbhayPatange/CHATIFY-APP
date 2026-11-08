import { ClockIcon } from "lucide-react";

const LABELS = {
  pending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  seen: "Seen",
};

/**
 * WhatsApp-style delivery ticks:
 *   pending   -> clock
 *   sent      -> one grey tick
 *   delivered -> two grey ticks
 *   seen      -> two blue ticks
 */
function MessageStatus({ status = "sent", className = "text-white/60", size = 16 }) {
  const label = LABELS[status] ?? LABELS.sent;

  if (status === "pending") {
    return (
      <span role="img" aria-label={label} className={`inline-flex ${className}`}>
        <ClockIcon style={{ width: size - 3, height: size - 3 }} strokeWidth={2.2} />
      </span>
    );
  }

  const double = status === "delivered" || status === "seen";
  const color = status === "seen" ? "text-pl-blue" : className;

  return (
    <span role="img" aria-label={label} className={`inline-flex ${color}`}>
      <svg
        width={size}
        height={size * 0.65}
        viewBox="0 0 17 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {double ? (
          <>
            <path d="M1 6l3.3 3.3L11 1.5" />
            <path d="M6 8.2l1.1 1.1L15.5 1.5" />
          </>
        ) : (
          <path d="M3.5 6l3.3 3.3L13.5 1.5" />
        )}
      </svg>
    </span>
  );
}
export default MessageStatus;
