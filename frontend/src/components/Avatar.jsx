const avatarColors = ["bg-[#eed0ff]", "bg-[#d9efad]", "bg-[#ffcab9]", "bg-[#c0defe]", "bg-[#ffcada]"];

function Avatar({ src, name = "", size = "size-12", online }) {
  const words = name.trim().split(/\s+/u);
  const initials = [words[0], ...(words.length > 1 ? [words.at(-1)] : [])]
    .map((word) => Array.from(word)[0]).join("").toLocaleUpperCase();
  const colorIndex = Array.from(name).reduce((sum, char) => sum + char.codePointAt(0), 0) % avatarColors.length;

  return (
    <div className={`relative shrink-0 ${size}`}>
      {src ? (
        <img src={src} alt={name ? `${name}'s profile picture` : ""} className="size-full rounded-full bg-pl-selected object-cover" />
      ) : (
        <span aria-label={name} className={`grid size-full place-items-center rounded-full font-bold text-pl-bg ${avatarColors[colorIndex]}`}>{initials || "?"}</span>
      )}
      {online && <span className="absolute bottom-0 right-0 size-3 rounded-full bg-pl-accent ring-2 ring-pl-panel" aria-label="Online" />}
    </div>
  );
}
export default Avatar;
