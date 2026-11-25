import { useEffect, useRef, useState } from "react";
import { Maximize2Icon, MicIcon, MicOffIcon, Minimize2Icon, MoveIcon, PhoneCallIcon, PhoneOffIcon, VideoIcon } from "lucide-react";
import { useCallStore } from "../store/useCallStore";
import { useAuthStore } from "../store/useAuthStore";

const CARD_WIDTH = 192;
const CARD_HEIGHT = 220;
const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
const bounds = () => {
  const view = window.visualViewport;
  return { left: view?.offsetLeft || 0, top: view?.offsetTop || 0, width: view?.width || window.innerWidth, height: view?.height || window.innerHeight };
};
const fit = (x, y) => {
  const view = bounds();
  return { x: clamp(x, view.left + 8, view.left + view.width - CARD_WIDTH - 8), y: clamp(y, view.top + 8, view.top + view.height - CARD_HEIGHT - 8) };
};

export default function CallOverlay() {
  const socket = useAuthStore((state) => state.socket);
  const authUser = useAuthStore((state) => state.authUser);
  const { status, kind, localStream, remoteStream, muted, accept, reject, end, toggleMute } = useCallStore();
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 8, y: 8 });
  const drag = useRef(null);
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const remoteAudio = useRef(null);
  useEffect(() => useCallStore.getState().bindSocket(socket), [socket]);
  useEffect(() => { if (authUser) useCallStore.getState().loadCallHistory(); }, [authUser]);
  useEffect(() => { if (localVideo.current) localVideo.current.srcObject = localStream; }, [localStream, kind, status]);
  useEffect(() => { if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream; }, [remoteStream, kind, status]);
  useEffect(() => { if (remoteAudio.current) remoteAudio.current.srcObject = remoteStream; }, [remoteStream, status]);
  useEffect(() => {
    if (!minimized) return;
    const keepVisible = () => setPosition((point) => fit(point.x, point.y));
    window.addEventListener("resize", keepVisible);
    window.visualViewport?.addEventListener("resize", keepVisible);
    window.visualViewport?.addEventListener("scroll", keepVisible);
    return () => { window.removeEventListener("resize", keepVisible); window.visualViewport?.removeEventListener("resize", keepVisible); window.visualViewport?.removeEventListener("scroll", keepVisible); };
  }, [minimized]);
  useEffect(() => { if (status === "idle") setMinimized(false); }, [status]);

  if (status === "idle") return null;
  const ringing = status === "ringing";
  const label = ringing ? "Incoming call" : status === "calling" ? "Calling…" : kind === "video" ? "Video call" : "Voice call";
  const minimize = () => { const view = bounds(); setPosition(fit(view.left + view.width - CARD_WIDTH - 12, view.top + 12)); setMinimized(true); };
  const startDrag = (event) => {
    drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event) => {
    if (drag.current) setPosition(fit(drag.current.left + event.clientX - drag.current.x, drag.current.top + event.clientY - drag.current.y));
  };

  return <div className={minimized ? "fixed z-50 overflow-hidden rounded-2xl border border-white/20 bg-black text-white shadow-2xl" : "fixed inset-0 z-50 overflow-hidden bg-black text-white"} style={minimized ? { left: position.x, top: position.y, width: CARD_WIDTH, height: CARD_HEIGHT } : undefined}>
    <audio ref={remoteAudio} autoPlay playsInline />
    {kind === "video" ? <>
      <video ref={remoteVideo} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover" />
      {!remoteStream && <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-pl-panel to-black"><div className="text-center text-pl-muted"><VideoIcon className="mx-auto mb-3 size-8" /><p className="px-2 text-sm">{ringing ? "Answer to start video" : "Waiting for the other person…"}</p></div></div>}
      <video ref={localVideo} autoPlay muted playsInline className={`absolute rounded-xl border border-white/20 bg-pl-panel object-cover shadow-xl ${minimized ? "right-2 top-10 h-14 w-11" : "right-4 top-16 h-32 w-24 sm:h-44 sm:w-32"}`} />
    </> : <div className="grid h-full place-items-center bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-pl-panel via-pl-bg to-black"><div className="text-center"><PhoneCallIcon className="mx-auto mb-2 size-9 text-pl-accent" /><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-pl-muted">{ringing ? "Someone wants to talk" : status === "calling" ? "Ringing…" : muted ? "Microphone muted" : "Connected"}</p></div></div>}
    <div className={`absolute inset-x-0 top-0 flex items-center gap-2 bg-gradient-to-b from-black/80 to-transparent ${minimized ? "p-2" : "p-5"}`}>
      {minimized ? <div onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} className="flex min-w-0 flex-1 touch-none cursor-move items-center gap-1" title="Drag to move call"><MoveIcon className="size-4 shrink-0" /><span className="truncate text-xs font-medium">{label}</span></div> : <><PhoneCallIcon className="size-5 text-pl-accent" /><span className="flex-1 font-medium">{label}</span></>}
      {!ringing && <button type="button" onClick={minimized ? () => setMinimized(false) : minimize} aria-label={minimized ? "Expand call" : "Minimize call to chat"} title={minimized ? "Expand call" : "Minimize call to chat"} className="rounded-full bg-black/40 p-2 hover:bg-white/20">{minimized ? <Maximize2Icon className="size-4" /> : <Minimize2Icon className="size-5" />}</button>}
    </div>
    <div className={`absolute inset-x-0 bottom-0 flex justify-center gap-3 bg-gradient-to-t from-black/90 to-transparent ${minimized ? "px-2 pb-2 pt-5" : "px-5 pb-8 pt-20"}`}>
      {ringing ? <><button type="button" onClick={accept} className="grid size-14 place-items-center rounded-full bg-pl-accent text-pl-bg shadow-lg" aria-label="Accept call"><PhoneCallIcon /></button><button type="button" onClick={reject} className="grid size-14 place-items-center rounded-full bg-red-600 text-white shadow-lg" aria-label="Reject call"><PhoneOffIcon /></button></> : <><button type="button" onClick={toggleMute} aria-label={muted ? "Unmute microphone" : "Mute microphone"} aria-pressed={muted} className={`grid ${minimized ? "size-9" : "size-14"} place-items-center rounded-full shadow-lg ${muted ? "bg-white text-black" : "bg-white/20 text-white hover:bg-white/30"}`}>{muted ? <MicOffIcon className="size-5" /> : <MicIcon className="size-5" />}</button><button type="button" onClick={end} className={`grid ${minimized ? "size-9" : "size-14"} place-items-center rounded-full bg-red-600 text-white shadow-lg`} aria-label="End call"><PhoneOffIcon className="size-5" /></button></>}
    </div>
  </div>;
}
