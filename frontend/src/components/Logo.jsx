// Pinglet mark: a speech bubble holding a double tick.
function Logo({ className = "size-10", rounded = true }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Pinglet">
      {rounded && <rect width="64" height="64" rx="15" fill="#00a884" />}
      <path
        d="M32 12C20.4 12 11 19.6 11 29c0 5 2.6 9.5 6.8 12.6-.3 3.4-1.8 6.3-3.8 8.2 4.6-.2 8.5-1.9 11.2-4.1 2.2.5 4.5.8 6.8.8 11.6 0 21-7.6 21-17.5S43.6 12 32 12z"
        fill="#fff"
      />
      <g fill="none" stroke="#00a884" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 29.5l4.5 4.5L34 24" />
        <path d="M30 31.5l2.5 2.5L42 23" />
      </g>
    </svg>
  );
}
export default Logo;
