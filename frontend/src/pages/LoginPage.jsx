import { useState } from "react";
import { Link } from "react-router";
import { LoaderIcon, LockIcon, MailIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import AuthLayout from "../components/AuthLayout";

function LoginPage() {
  const [formData, setFormData] = useState({ email: "", password: "" });
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
              type="password"
              autoComplete="current-password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="input"
              placeholder="Your password"
            />
          </div>
        </div>

        <button className="auth-btn" type="submit" disabled={isLoggingIn}>
          {isLoggingIn ? <LoaderIcon className="mx-auto size-5 animate-spin" aria-label="Logging in" /> : "Log in"}
        </button>
      </form>
    </AuthLayout>
  );
}
export default LoginPage;
