import { useState } from "react";
import { Link } from "react-router";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import AuthLayout from "../components/AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const submit = async (event) => {
    event.preventDefault();
    try { await forgotPassword(email.trim()); setSent(true); } catch { toast.error("Could not request a reset. Try again later."); }
  };
  return <AuthLayout title="Reset password" subtitle={sent ? "Check your inbox for a reset link." : "Enter your account email."} footer={<Link to="/login" className="auth-link">Back to login</Link>}>
    {!sent && <form onSubmit={submit} className="space-y-5"><input className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /><button className="auth-btn">Email reset link</button></form>}
  </AuthLayout>;
}
