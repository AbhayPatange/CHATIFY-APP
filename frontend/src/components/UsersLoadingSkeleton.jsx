function UsersLoadingSkeleton() {
  return (
    <div role="status" aria-label="Loading chats">
      {[1, 2, 3, 4, 5].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-3 px-3 py-3">
          <div className="size-[49px] rounded-full bg-pl-header" />
          <div className="flex-1">
            <div className="mb-2 h-4 w-3/5 rounded bg-pl-header" />
            <div className="h-3 w-2/5 rounded bg-pl-header/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
export default UsersLoadingSkeleton;
