import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { axiosInstance, getErrorMessage } from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { android, alerts, configureAlerts, notificationPreference } from "../lib/alerts";

export default function AccountSettings() {
  const user = useAuthStore(s => s.authUser);
  const [name, setName] = useState(user.fullName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [changing, setChanging] = useState(false);
  const [enabled, setEnabled] = useState(notificationPreference(user._id) === "on");
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const { data } = await axiosInstance.get("/auth/check");
        if (active && data._id === user._id) useAuthStore.setState(s => s.authUser?._id === user._id ? { authUser: { ...s.authUser, email: data.email } } : {});
      } catch { /* Keep the last confirmed address when offline. */ }
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => { active = false; window.removeEventListener("focus", refresh); };
  }, [user._id]);

  async function save(event, field) {
    event.preventDefault(); setBusy(true);
    try {
      if (field === "name") {
        const { data } = await axiosInstance.put("/settings/name", { fullName: name });
        useAuthStore.setState(s => s.authUser?._id === user._id ? { authUser: { ...s.authUser, fullName: data.fullName } } : {});
        setName(data.fullName); toast.success("Name updated");
      } else {
        const { data } = await axiosInstance.post("/settings/email", { email, password });
        setChanging(false); setPassword(""); setEmail(""); toast.success(data.message);
      }
    } catch (error) { toast.error(getErrorMessage(error)); }
    finally { setBusy(false); }
  }
  async function toggleAlerts() {
    try {
      if (enabled) {
        await alerts.disable();
        localStorage.setItem("pinglet-alerts:" + user._id, "off"); setEnabled(false);
      } else {
        const allowed = await configureAlerts(user._id, true); setEnabled(allowed);
        if (!allowed) toast.error("Allow message notifications in Android Settings.");
      }
    } catch { toast.error("Could not update notifications."); }
  }
  return <section className="mt-8 space-y-5">
    <h3 className="text-lg font-semibold">Account</h3>
    <form onSubmit={e => save(e,"name")}><label className="auth-input-label" htmlFor="account-name">Display name</label>
      <input id="account-name" className="input pl-3" value={name} required minLength={2} maxLength={50} onChange={e => setName(e.target.value)} />
      <button disabled={busy || name.trim() === user.fullName || name.trim().length < 2} className="mt-2 text-sm text-pl-accent disabled:opacity-40">Save name</button></form>
    <div><h4 className="auth-input-label">Sign-in email</h4><p className="break-all">{user.email}</p>
      <button type="button" className="mt-2 text-sm text-pl-accent" onClick={() => { setChanging(!changing); setPassword(""); }}>{changing ? "Cancel email change" : "Change email"}</button></div>
    {changing && <form onSubmit={e => save(e,"email")} className="space-y-3">
      <label className="block text-sm">New email<input type="email" required maxLength={254} className="input mt-1 pl-3" value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label className="block text-sm">Current password<input type="password" required autoComplete="current-password" className="input mt-1 pl-3" value={password} onChange={e => setPassword(e.target.value)} /></label>
      <button disabled={busy} className="auth-btn">Send verification link</button></form>}
    {android && <button type="button" role="switch" aria-checked={enabled} onClick={toggleAlerts} className="flex w-full justify-between rounded-xl bg-pl-chip p-3">Message notifications<span>{enabled ? "On" : "Off"}</span></button>}
  </section>;
}
