const WIDTHS = ["w-40", "w-56", "w-32", "w-48", "w-36", "w-52"];

function MessagesLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-3" role="status" aria-label="Loading messages">
      {WIDTHS.map((w, index) => (
        <div key={index} className={`flex ${index % 2 === 0 ? "justify-start" : "justify-end"}`}>
          <div className={`h-9 ${w} animate-pulse rounded-lg ${index % 2 === 0 ? "bg-pl-header" : "bg-pl-out/60"}`} />
        </div>
      ))}
    </div>
  );
}
export default MessagesLoadingSkeleton;
