function Avatar({ src, name = "", size = "size-12", online }) {
  return (
    <div className={`relative shrink-0 ${size}`}>
      <img
        src={src || "/avatar.png"}
        alt={name ? `${name}'s profile picture` : ""}
        className="size-full rounded-full object-cover bg-pl-selected"
      />
      {online && (
        <span
          className="absolute bottom-0 right-0 size-3 rounded-full bg-pl-accent ring-2 ring-pl-panel"
          aria-label="Online"
        />
      )}
    </div>
  );
}
export default Avatar;
