import { useState } from "react";
import { Link } from "react-router";
import { EyeIcon, EyeOffIcon, LoaderIcon, LockIcon, MailIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AuthLayout from "../components/AuthLayout";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);

  const handleSubmit = (e) => {
    e.preventDefault();
    login({ ...formData, email: formData.email.trim() });
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to pick up your conversations."
      footer={
        <p className="text-sm text-pl-muted">
          New to Pinglet?{" "}
          <Link to="/signup" className="auth-link">
            Create an account
          </Link>
          <br /><Link to="/forgot-password" className="auth-link">Forgot password?</Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder="Your password"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 text-pl-muted hover:text-pl-text">
              {showPassword ? <EyeOffIcon className="size-5" /> : <EyeIcon className="size-5" />}
            </button>
          </div>
          <Link to="/forgot-password" className="auth-link mt-2 inline-block text-sm">Forgot password?</Link>
        </div>

        <button className="auth-btn" type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? <LoaderIcon className="mx-auto size-5 animate-spin" aria-label="Logging in" /> : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
export default LoginPage;
