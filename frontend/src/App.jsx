import { Navigate, Route, Routes } from "react-router";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { useAuthStore } from "./store/useAuthStore";
import PageLoader from "./components/PageLoader";

function captureInvite() {
    const url = new URL(window.location.href);
    const invite = url.searchParams.get("connect");
    if (invite && /^(?:[A-Z0-9]{7}|P-[A-F0-9]{14})$/i.test(invite)) {
      sessionStorage.setItem("pingletInvite", invite.toUpperCase());
      url.searchParams.delete("connect");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
}
captureInvite();

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isCheckingAuth = useAuthStore((s) => s.isCheckingAuth);
  const authUser = useAuthStore((s) => s.authUser);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth) return <PageLoader />;

  return (
    <div className="min-h-dvh bg-pl-bg">
      <Routes>
        <Route path="/" element={authUser ? <ChatPage /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={!authUser ? <LoginPage /> : <Navigate to="/" replace />} />
        <Route path="/signup" element={!authUser ? <SignUpPage /> : <Navigate to="/" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        toastOptions={{
          style: { background: "#332c3d", color: "#fbf6ff", fontSize: "14px" },
          success: { iconTheme: { primary: "#daf88b", secondary: "#201c27" } },
        }}
      />
    </div>
  );
}

export default App;
