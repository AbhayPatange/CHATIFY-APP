import { useState } from "react";
import { Link } from "react-router";
import { EyeIcon, EyeOffIcon, LoaderIcon, LockIcon, MailIcon, UserIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AuthLayout from "../components/AuthLayout";

function SignUpPage() {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const signup = useAuthStore((s) => s.signup);
  const isSigningUp = useAuthStore((s) => s.isSigningUp);

  const handleSubmit = (e) => {
    e.preventDefault();
    signup({ ...formData, fullName: formData.fullName.trim(), email: formData.email.trim() });
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="It takes a minute. Then say hi to someone."
      footer={
        <p className="text-sm text-pl-muted">
          Already on Pinglet?{" "}
          <Link to="/login" className="auth-link">
            Log in
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="fullName" className="auth-input-label">
            Full name
          </label>
          <div className="relative">
            <UserIcon className="auth-input-icon" />
            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              maxLength={50}
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="input"
              placeholder="Your name"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="auth-input-label">
            Email
          </label>
          <div className="relative">
            <MailIcon className="auth-input-icon" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="auth-input-label">
            Password
          </label>
          <div className="relative">
            <LockIcon className="auth-input-icon" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={72}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder="At least 6 characters"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-pl-muted hover:text-pl-text">
              {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          </div>
        </div>

        <button className="auth-btn" type="submit" disabled={isSigningUp}>
          {isSigningUp ? <LoaderIcon className="mx-auto size-5 animate-spin" aria-label="Creating account" /> : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
export default SignUpPage;
