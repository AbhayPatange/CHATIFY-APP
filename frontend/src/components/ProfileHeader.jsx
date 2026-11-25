import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { CameraIcon, LogOutIcon, XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { readFileAsDataURL, validateImageFile } from "../lib/image";
import Logo from "./Logo";

export default function ProfileHeader() {
  const authUser = useAuthStore((s) => s.authUser);
  const logout = useAuthStore((s) => s.logout);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isUpdating = useAuthStore((s) => s.isUpdatingProfile);
  const blockedUsers = useAuthStore((s) => s.blockedUsers);
  const loadBlockedUsers = useAuthStore((s) => s.loadBlockedUsers);
  const setUserBlocked = useAuthStore((s) => s.setUserBlocked);
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState("");
  const fileRef = useRef(null);

  const openProfile = () => { setBio(authUser.bio || ""); setOpen(true); loadBlockedUsers(); };
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) return toast.error(problem);
    try { await updateProfile({ profilePic: await readFileAsDataURL(file) }); }
    catch { toast.error("Could not read that image"); }
  };

  return <>
    <header className="flex h-[84px] shrink-0 items-center justify-between bg-pl-panel px-5">
      <div className="flex items-center gap-2"><span className="grid size-11 place-items-center rounded-2xl bg-pl-accent/15"><Logo className="size-8" /></span><div><span className="text-xl font-semibold tracking-tight text-pl-text">Pinglet</span><p className="text-[10px] uppercase tracking-[.22em] text-pl-muted">Stay close</p></div></div>
      <div className="flex items-center gap-2"><button type="button" onClick={logout} aria-label="Log out" title="Log out" className="grid size-10 place-items-center rounded-full text-pl-muted hover:bg-pl-selected"><LogOutIcon className="size-5" /></button><button type="button" onClick={openProfile} aria-label="Open your profile" title="Your profile" className="size-10 overflow-hidden rounded-full ring-2 ring-pl-line"><img src={authUser.profilePic || "/avatar.png"} alt="" className="size-full object-cover" /></button></div>
    </header>
    {open && <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Your profile"><section className="flex h-full w-full max-w-sm flex-col bg-pl-panel text-pl-text shadow-2xl"><header className="flex items-center justify-between border-b border-pl-line px-6 py-4"><h2 className="text-xl font-semibold">Your profile</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close profile" className="rounded-full p-2 hover:bg-pl-hover"><XIcon /></button></header><div className="flex-1 overflow-y-auto p-6">
      <div className="flex flex-col items-center"><button type="button" onClick={() => fileRef.current?.click()} disabled={isUpdating} className="group relative size-28 overflow-hidden rounded-full" aria-label="Change profile picture"><img src={authUser.profilePic || "/avatar.png"} alt="" className="size-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-black/40 text-white"><CameraIcon className="size-6" /></span></button><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={upload} className="hidden" /><p className="mt-2 text-xs text-pl-muted">{isUpdating ? "Updating…" : "Change photo"}</p><h3 className="mt-3 text-xl font-semibold">{authUser.fullName}</h3></div>
      <form className="mt-8" onSubmit={async (event) => { event.preventDefault(); const ok = await updateProfile({ bio }); if (ok) setBio(bio.trim()); }}><label htmlFor="profile-bio" className="text-sm font-medium">About you</label><textarea id="profile-bio" maxLength={160} value={bio} onChange={(event) => setBio(event.target.value)} placeholder="Add a short bio" className="mt-2 w-full resize-none rounded-xl border border-pl-line bg-pl-header p-3 text-sm text-pl-text outline-none focus:ring-1 focus:ring-pl-accent" rows={3} /><div className="flex items-center justify-between"><span className="text-xs text-pl-muted">{bio.length}/160</span><button type="submit" disabled={isUpdating || bio === (authUser.bio || "")} className="rounded-xl bg-pl-accent px-4 py-2 text-sm font-medium text-pl-bg disabled:opacity-50">Save bio</button></div></form>
      <section className="mt-8"><h3 className="text-base font-semibold">Blocked contacts</h3><p className="mt-1 text-xs text-pl-muted">Blocked people cannot message or call you.</p>{blockedUsers.length ? <ul className="mt-3 space-y-2">{blockedUsers.map((user) => <li key={user._id} className="flex items-center gap-3 rounded-xl bg-pl-header p-3"><img src={user.profilePic || "/avatar.png"} alt="" className="size-10 rounded-full object-cover" /><span className="min-w-0 flex-1 truncate">{user.fullName}</span><button type="button" onClick={() => setUserBlocked(user._id, false)} className="text-sm font-medium text-pl-accent">Unblock</button></li>)}</ul> : <p className="mt-3 rounded-xl bg-pl-header p-4 text-sm text-pl-muted">No blocked contacts</p>}</section>
    </div></section></div>}
  </>;
}
