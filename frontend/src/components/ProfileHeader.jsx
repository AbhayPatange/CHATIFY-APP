import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { BanIcon, LogOutIcon, VolumeOffIcon, Volume2Icon, LoaderIcon, XIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { readFileAsDataURL, validateImageFile } from "../lib/image";
import Logo from "./Logo";

let mouseClickSound = null;
const playClick = () => {
  if (!mouseClickSound) mouseClickSound = new Audio("/sounds/mouse-click.mp3");
  mouseClickSound.currentTime = 0;
  mouseClickSound.play().catch(() => {});
};

const iconBtn =
  "grid size-10 place-items-center rounded-full text-pl-muted transition-colors hover:bg-pl-selected hover:text-pl-text";

function ProfileHeader() {
  const logout = useAuthStore((s) => s.logout);
  const authUser = useAuthStore((s) => s.authUser);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const isUpdatingProfile = useAuthStore((s) => s.isUpdatingProfile);
  const isSoundEnabled = useChatStore((s) => s.isSoundEnabled);
  const toggleSound = useChatStore((s) => s.toggleSound);
  const blockedUsers = useAuthStore((s) => s.blockedUsers);
  const setUserBlocked = useAuthStore((s) => s.setUserBlocked);
  const [showBlocked, setShowBlocked] = useState(false);

  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;

    const problem = validateImageFile(file);
    if (problem) return toast.error(problem);

    try {
      // the avatar only changes once the server confirms (authUser is updated by the store)
      await updateProfile({ profilePic: await readFileAsDataURL(file) });
    } catch {
      toast.error("Could not read that image");
    }
  };

  return <>
    <header className="flex h-[84px] shrink-0 items-center justify-between bg-pl-panel px-5">
      <div className="flex items-center gap-2">
        <span className="grid size-11 place-items-center rounded-2xl bg-pl-accent/15"><Logo className="size-8" /></span>
        <div><span className="text-xl font-semibold tracking-tight text-pl-text">Pinglet</span><p className="text-[10px] uppercase tracking-[.22em] text-pl-muted">Stay close</p></div>
      </div>

      <div className="flex items-center gap-1">
        <button className={iconBtn} onClick={() => setShowBlocked(true)} aria-label="Manage blocked users" title="Blocked users"><BanIcon className="size-5" /></button>
        <button
          className={iconBtn}
          aria-label={isSoundEnabled ? "Mute sounds" : "Enable sounds"}
          title={isSoundEnabled ? "Mute sounds" : "Enable sounds"}
          onClick={() => {
            playClick();
            toggleSound();
          }}
        >
          {isSoundEnabled ? <Volume2Icon className="size-5" /> : <VolumeOffIcon className="size-5" />}
        </button>

        <button className={iconBtn} onClick={logout} aria-label="Log out" title="Log out">
          <LogOutIcon className="size-5" />
        </button>

        {/* my avatar: click to change the profile picture */}
        <button
          className="group relative ml-1 size-9 overflow-hidden rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUpdatingProfile}
          aria-label="Change profile picture"
          title={`${authUser.fullName} – change profile picture`}
        >
          <img src={authUser.profilePic || "/avatar.png"} alt="" className="size-full object-cover" />
          <span
            className={`absolute inset-0 grid place-items-center bg-black/55 transition-opacity ${
              isUpdatingProfile ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            }`}
          >
            {isUpdatingProfile ? <LoaderIcon className="size-4 animate-spin text-white" /> : <span className="text-[10px] text-white">Edit</span>}
          </span>
        </button>
        <input
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          ref={fileInputRef}
          onChange={handleImageUpload}
          className="hidden"
          tabIndex={-1}
        />
      </div>
    </header>
    {showBlocked && <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Blocked users"><section className="h-full w-full max-w-sm bg-pl-panel p-6 text-pl-text shadow-2xl"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">Blocked users</h2><button onClick={() => setShowBlocked(false)} aria-label="Close blocked users"><XIcon /></button></div><p className="mb-5 text-sm text-pl-muted">Blocked people cannot message or call you.</p>{blockedUsers.length ? <ul className="space-y-3">{blockedUsers.map((user) => <li key={user._id} className="flex items-center gap-3 rounded-xl bg-pl-header p-3"><img src={user.profilePic || "/avatar.png"} alt="" className="size-10 rounded-full object-cover" /><span className="min-w-0 flex-1 truncate">{user.fullName}</span><button type="button" onClick={() => setUserBlocked(user._id, false)} className="text-sm font-medium text-pl-accent hover:underline">Unblock</button></li>)}</ul> : <p className="rounded-xl bg-pl-header p-5 text-center text-sm text-pl-muted">No blocked users</p>}</section></div>}
  </>;
}
export default ProfileHeader;
