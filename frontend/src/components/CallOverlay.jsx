import { useEffect, useRef } from "react";
import { PhoneCallIcon, PhoneOffIcon, VideoIcon, XIcon } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

export default function CallOverlay() {
  const socket = useAuthStore((state) => state.socket);
  const { status, kind, localStream, remoteStream, accept, reject, end } = useCallStore();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  useEffect(() => useCallStore.getState().bindSocket(socket), [socket]);
  useEffect(() => { if (localVideo.current) localVideo.current.srcObject = localStream; }, [localStream]);
  useEffect(() => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream; }, [remoteStream]);
  if (status === "idle") return null;
  const ringing = status === "ringing";
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
    <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-pl-panel p-4 text-pl-text shadow-2xl">
      <button type="button" onClick={end} aria-label="End call" className="absolute right-3 top-3 text-pl-muted hover:text-white"><XIcon /></button>
      <div className="mb-3 flex items-center gap-2"><PhoneCallIcon className="text-pl-accent" /><span>{ringing ? "Incoming call" : status === "calling" ? "Calling…" : "Connected"}</span></div>
      {kind === "video" && <div className="relative aspect-video overflow-hidden rounded-xl bg-black"><video ref={remoteVideo} autoPlay playsInline className="h-full w-full object-contain" /><video ref={localVideo} autoPlay muted playsInline className="absolute bottom-3 right-3 h-24 w-32 rounded-lg object-cover" /></div>}
      {kind === "audio" && <div className="grid h-48 place-items-center rounded-xl bg-pl-bg text-pl-muted">Voice call</div>}
      <div className="mt-4 flex justify-center gap-3">
        {ringing && <><button type="button" onClick={accept} className="grid size-12 place-items-center rounded-full bg-pl-accent text-pl-bg" aria-label="Accept call"><PhoneCallIcon /></button><button type="button" onClick={reject} className="grid size-12 place-items-center rounded-full bg-red-600 text-white" aria-label="Reject call"><PhoneOffIcon /></button></>}
        {!ringing && <button type="button" onClick={end} className="grid size-12 place-items-center rounded-full bg-red-600 text-white" aria-label="End call"><PhoneOffIcon /></button>}
      </div>
    </div>
  </div>;
}
