import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import App from "../App";
import { axiosInstance, getErrorMessage } from "../lib/axios";
import { alerts } from "../lib/alerts";

function ConfirmEmail({ token }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function confirm() {
    setBusy(true);
    try { const { data } = await axiosInstance.post("/settings/confirm-email", { token }); setResult(data.message); }
    catch (error) { setResult(getErrorMessage(error)); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-md px-6 py-16"><h1 className="text-2xl font-bold">Confirm email change</h1>
    {result ? <><p className="my-4" role="status">{result}</p><a href="/" className="auth-link">Back to Pinglet</a></> :
    <><p className="my-4 text-pl-muted">Use this verified address for your Pinglet sign-in?</p><button className="auth-btn" disabled={busy} onClick={confirm}>Confirm new address</button></>}
  </main>;
}

export default function Startup() {
  const [connected, setConnected] = useState(Capacitor.getPlatform() !== "android");
  const [declined, setDeclined] = useState(false);
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get("email-change"));
  if (!connected) return <main className="grid min-h-dvh place-items-center bg-pl-bg p-5"><section className="w-full max-w-sm rounded-3xl bg-pl-panel p-6">
    <h1 className="text-2xl font-semibold">{declined ? "Pinglet is offline" : "Allow network access?"}</h1>
    <p className="my-4 text-sm text-pl-muted">Pinglet uses Wi-Fi or mobile data for chats, calls, and background message alerts.</p>
    <button type="button" className="auth-btn" onClick={() => setConnected(true)}>Allow and connect</button>
    {!declined && <button type="button" className="mt-2 w-full py-3 text-pl-muted" onClick={() => { setDeclined(true); alerts.disable().catch(() => {}); }}>Stay offline</button>}
  </section></main>;
  return token ? <ConfirmEmail token={token} /> : <App />;
}
