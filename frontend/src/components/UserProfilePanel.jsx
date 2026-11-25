import { useEffect, useState } from "react";
import { BanIcon, MessageCircleIcon, ShieldCheckIcon, UserRoundIcon, XIcon } from "lucide-react";
import Avatar from "./Avatar";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { encryptionKeyFingerprint } from "../lib/keyFingerprint";

export default function UserProfilePanel() {
  const profileUser = useChatStore((s) => s.profileUser);
  const setProfileUser = useChatStore((s) => s.setProfileUser);
  const selectedUser = useChatStore((s) => s.selectedUser);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const setUserBlocked = useAuthStore((s) => s.setUserBlocked);
  const blockedUsers = useAuthStore((s) => s.blockedUsers);
  const [busy, setBusy] = useState(false);
  const [fingerprint, setFingerprint] = useState("");
  const [verified, setVerified] = useState(false);
  const myId = useAuthStore((s) => s.authUser?._id);
  useEffect(() => {
    let active = true;
    if (profileUser?.encryptionPublicKey) encryptionKeyFingerprint(profileUser.encryptionPublicKey).then((value) => {
      if (active) { setFingerprint(value); setVerified(localStorage.getItem(`pinglet-key:${myId}:${profileUser._id}`) === value); }
    }).catch(() => { if (active) setFingerprint(""); });
    return () => { active = false; };
  }, [profileUser, myId]);
  if (!profileUser) return null;
  const isBlocked = blockedUsers.some((user) => user._id === profileUser._id);
  const close = () => setProfileUser(null);
  const handleBlock = async () => {
    setBusy(true);
    const updated = await setUserBlocked(profileUser._id, !isBlocked);
    setBusy(false);
    if (updated) close();
  };
  return <div className="fixed inset-0 z-40 flex justify-end bg-slate-950/45 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${profileUser.fullName} profile`}>
    <section className="flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-pl-panel text-pl-text shadow-2xl animate-in slide-in-from-right duration-200">
      <header className="flex items-center justify-between border-b border-white/10 px-5 py-4"><span className="text-xs font-semibold uppercase tracking-[.2em] text-slate-400">Profile</span><button type="button" onClick={close} aria-label="Close profile" className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"><XIcon className="size-5" /></button></header>
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="relative mx-auto mb-6 grid size-32 place-items-center rounded-full bg-gradient-to-br from-violet-500/40 to-pl-blue/30 p-1"><Avatar src={profileUser.profilePic} name={profileUser.fullName} size="size-[120px]" /></div>
        <h2 className="text-center text-2xl font-semibold tracking-tight">{profileUser.fullName}</h2>
        <p className="mt-2 text-center text-sm text-slate-400">Pinglet member</p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wider text-pl-muted">About</p><p className="flex items-center gap-3 text-sm text-slate-300"><UserRoundIcon className="size-4 text-pl-blue" />{profileUser.bio || "No bio yet"}</p><p className="mt-3 flex items-center gap-3 text-sm text-slate-300"><ShieldCheckIcon className="size-4 text-emerald-300" />End-to-end encrypted chat</p></div>
        <section className="mt-5 rounded-2xl border border-white/10 p-4"><h3 className="font-medium">Contact security code</h3><p className="mt-2 text-xs text-slate-400">Compare this code with the code in their own profile using another trusted channel. Only verify if every character matches.</p><p className="mt-3 break-all font-mono text-xs text-slate-200">{fingerprint || "Security code unavailable"}</p><button type="button" disabled={!fingerprint || verified} onClick={() => { localStorage.setItem(`pinglet-key:${myId}:${profileUser._id}`, fingerprint); setVerified(true); }} className="mt-3 rounded-lg bg-pl-accent px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-50">{verified ? "Verified on this device" : "Codes match — verify"}</button><p className="mt-2 text-xs text-slate-400">If their key changes, verify the new code before sending again.</p></section>
        <div className="mt-5 grid gap-3">{!isBlocked && <button type="button" onClick={() => { setSelectedUser(profileUser); close(); }} className="flex items-center justify-center gap-2 rounded-xl bg-pl-accent px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-pl-accentDark"><MessageCircleIcon className="size-4" />{selectedUser?._id === profileUser._id ? "Back to chat" : "Message"}</button>}<button type="button" disabled={busy} onClick={handleBlock} className="flex items-center justify-center gap-2 rounded-xl border border-rose-400/20 px-4 py-3 text-sm font-medium text-rose-300 transition hover:bg-rose-400/10 disabled:opacity-50"><BanIcon className="size-4" />{isBlocked ? "Unblock user" : "Block user"}</button></div>
      </div>
    </section>
  </div>;
}
