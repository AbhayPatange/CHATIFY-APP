import Logo from "./Logo";


function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <main className="auth-canvas relative min-h-dvh w-full">


      <div className="relative mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <div className="mb-7 flex items-center justify-start px-2 gap-3 text-white">
          <Logo className="size-11" />
          <span className="text-3xl font-bold tracking-[-0.06em]">Pinglet</span>
        </div>

        <div className="rounded-[2rem] border border-pl-line bg-pl-panel p-6 shadow-2xl sm:p-8">
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-pl-text">{title}</h1>
          <p className="mb-6 text-sm text-pl-muted">{subtitle}</p>
          {children}
        </div>

        <div className="mt-5 text-center">{footer}</div>
      </div>
    </main>
  );
}
export default AuthLayout;
