const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 24 * 60 * 60 * 1000;

const daysAgo = (date) => Math.round((startOfDay(new Date()) - startOfDay(date)) / DAY);

/** 09:41 AM / 21:41 depending on the user's locale */
export const formatTime = (value) =>
  new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** Right-hand timestamp in the chat list: time today, "Yesterday", weekday, then a date. */
export const formatListTime = (value) => {
  const date = new Date(value);
  const diff = daysAgo(date);
  if (diff <= 0) return formatTime(date);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
};

/** Separator chip inside a conversation. */
export const formatDayLabel = (value) => {
  const date = new Date(value);
  const diff = daysAgo(date);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return date.toLocaleDateString(undefined, { weekday: "long" });
  return date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
};

export const isSameDay = (a, b) => startOfDay(new Date(a)) === startOfDay(new Date(b));
