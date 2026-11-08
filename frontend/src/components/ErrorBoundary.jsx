import { Component } from "react";

export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-pl-bg p-6 text-center text-pl-text">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-pl-muted">An unexpected error occurred. Reloading usually fixes it.</p>
        <button className="auth-btn !w-auto px-8" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}
