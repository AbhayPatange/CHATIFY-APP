import Logo from "./Logo";

function PageLoader() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 bg-pl-bg" role="status" aria-label="Loading">
      <Logo className="size-16 animate-pulse" />
      <p className="text-sm text-pl-muted">Pinglet</p>
    </div>
  );
}
export default PageLoader;
