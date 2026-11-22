import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import AuthLayout from "../components/AuthLayout";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const submit = async (event) => {
    event.preventDefault();
    try { await resetPassword(params.get("token"), password); setDone(true); } catch (error) { toast.error(error.response?.data?.message || "Could not reset password."); }
  };
  return <AuthLayout title="Choose a new password" subtitle="This replaces your encrypted chat identity." footer={<Link to="/login" className="auth-link">{done ? "Log in" : "Back to login"}</Link>}>
    {!done && <form onSubmit={submit} className="space-y-5"><div className="relative"><input className="input pr-12" type={showPassword ? "text" : "password"} minLength={6} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-pl-muted">{showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}</button></div><button className="auth-btn">Reset password</button></form>}
  </AuthLayout>;
}
