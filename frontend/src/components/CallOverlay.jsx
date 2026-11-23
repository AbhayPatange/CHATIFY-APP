import { useEffect, useRef } from "react";
import { MicIcon, MicOffIcon, PhoneCallIcon, PhoneOffIcon, VideoIcon } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

export default function CallOverlay() {
  const socket = useAuthStore((state) => state.socket);
  const authUser = useAuthStore((state) => state.authUser);
  const { status, kind, localStream, remoteStream, muted, accept, reject, end, toggleMute } = useCallStore();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  useEffect(() => useCallStore.getState().bindSocket(socket), [socket]);
  useEffect(() => { if (authUser) useCallStore.getState().loadCallHistory(); }, [authUser]);
  useEffect(() => { if (localVideo.current) localVideo.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream; }, [remoteStream]);
  useEffect(() => { if (remoteAudio.current) remoteAudio.current.srcObject = remoteStream; }, [remoteStream]);
  if (status === "idle") return null;
  const ringing = status === "ringing";
  const label = ringing ? "Incoming call" : status === "calling" ? "Calling…" : kind === "video" ? "Video call" : "Voice call";
  return <div className="fixed inset-0 z-50 overflow-hidden bg-black text-white">
    <audio ref={remoteAudio} autoPlay playsInline />
    {kind === "video" ? <>
      <video ref={remoteVideo} autoPlay playsInline className="absolute inset-0 h-full w-full object-cover" />
      {!remoteStream && <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-pl-panel to-black"><div className="text-center text-pl-muted"><VideoIcon className="mx-auto mb-3 size-12" /><p>{ringing ? "Answer to start video" : "Waiting for the other person…"}</p></div></div>}
      <video ref={localVideo} autoPlay muted playsInline className="absolute right-4 top-16 h-32 w-24 rounded-2xl border border-white/20 bg-pl-panel object-cover shadow-xl sm:h-44 sm:w-32" />
    </> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-pl-panel via-pl-bg to-black"><div className="text-center"><div className="mx-auto mb-5 grid size-24 place-items-center rounded-full bg-pl-accent/20"><PhoneCallIcon className="size-11 text-pl-accent" /></div><p className="text-xl font-semibold">{label}</p><p className="mt-2 text-sm text-pl-muted">{ringing ? "Someone wants to talk" : status === "calling" ? "Ringing…" : muted ? "Your microphone is muted" : "Connected"}</p></div></div>}
    <div className="absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent p-5"><PhoneCallIcon className="size-5 text-pl-accent" /><span className="font-medium">{label}</span></div>
    <div className="absolute inset-x-0 bottom-0 flex justify-center gap-4 bg-gradient-to-t from-black/80 via-black/35 to-transparent px-5 pb-8 pt-20">
      {ringing ? <><button type="button" onClick={accept} className="grid size-14 place-items-center rounded-full bg-pl-accent text-pl-bg shadow-lg" aria-label="Accept call"><PhoneCallIcon /></button><button type="button" onClick={reject} className="grid size-14 place-items-center rounded-full bg-red-600 text-white shadow-lg" aria-label="Reject call"><PhoneOffIcon /></button></> : <><button type="button" onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"} aria-pressed={muted} className={`grid size-14 place-items-center rounded-full shadow-lg ${muted ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"}`}>{muted ? <MicOffIcon /> : <MicIcon />}</button><button type="button" onClick={end} className="grid size-14 place-items-center rounded-full bg-red-600 text-white shadow-lg" aria-label="End call"><PhoneOffIcon /></button></>}
    </div>
  </div>;
}
