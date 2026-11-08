import { Navigate, Route, Routes } from "react-router";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import ChatPage from "./pages/ChatPage";
import LoginPage from "./pages/LoginPage";
import SignUpPage from "./pages/SignUpPage";
import { useAuthStore } from "./store/useAuthStore";
import PageLoader from "./components/PageLoader";

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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <Toaster
        toastOptions={{
          style: { background: "#202c33", color: "#e9edef", fontSize: "14px" },
          success: { iconTheme: { primary: "#00a884", secondary: "#111b21" } },
        }}
      />
    </div>
  );
}

export default App;
