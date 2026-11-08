import { useRef } from "react";
import toast from "react-hot-toast";
import { LogOutIcon, VolumeOffIcon, Volume2Icon, LoaderIcon } from "lucide-react";
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

  return (
    <header className="flex h-[60px] shrink-0 items-center justify-between bg-pl-header px-4">
      <div className="flex items-center gap-2">
        <Logo className="size-8" />
        <span className="text-xl font-semibold tracking-tight text-pl-accent">Pinglet</span>
      </div>

      <div className="flex items-center gap-1">
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
  );
}
export default ProfileHeader;
