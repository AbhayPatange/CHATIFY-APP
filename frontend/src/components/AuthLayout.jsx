import Logo from "./Logo";

// Shared frame for login + sign up: green band on top, card below, like the WhatsApp Web entry screen.
function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="relative min-h-dvh w-full bg-pl-bg">
      <div className="absolute inset-x-0 top-0 h-56 bg-pl-accentDark" aria-hidden />

      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-6 flex items-center justify-center gap-3 text-white">
          <Logo className="size-11" />
          <span className="text-2xl font-semibold tracking-tight">Pinglet</span>
        </div>

        <div className="rounded-xl border border-pl-line bg-pl-panel p-7 shadow-2xl">
          <h1 className="mb-1 text-2xl font-semibold text-pl-text">{title}</h1>
          <p className="mb-6 text-sm text-pl-muted">{subtitle}</p>
          {children}
        </div>

        <div className="mt-5 text-center">{footer}</div>
      </div>
    </main>
  );
}
export default AuthLayout;
