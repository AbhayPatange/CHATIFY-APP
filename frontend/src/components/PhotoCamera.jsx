import { useEffect, useRef, useState } from "react";
import { CameraIcon, XIcon } from "lucide-react";

export default function PhotoCamera({ onPhoto, onClose }) {
  const video = useRef(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let closed = false;
    let stream;
    async function open() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (closed) stream.getTracks().forEach((track) => track.stop());
        else video.current.srcObject = stream;
      } catch {
        if (!closed) setError("Camera unavailable. Allow camera access or choose a gallery photo.");
      }
    }
    open();
    return () => { closed = true; stream?.getTracks().forEach((track) => track.stop()); };
  }, []);

  function capture() {
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    canvas.getContext("2d").drawImage(video.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onPhoto(blob);
      else setError("Could not capture this photo. Try again.");
    }, "image/jpeg", 0.9);
  }

  return <div role="dialog" aria-modal="true" aria-label="Take a photo" onKeyDown={(e) => { if (e.key === "Escape") onClose(); }} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4">
    <div className="w-full max-w-md rounded-2xl bg-pl-panel p-4">
      <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Take a photo</h2><button autoFocus type="button" aria-label="Close camera" onClick={onClose} className="grid size-10 place-items-center"><XIcon /></button></div>
      {error && <p role="alert" className="mb-3 text-sm">{error}</p>}
      <video autoPlay playsInline muted ref={video} onLoadedData={() => setReady(true)} className="max-h-[60dvh] w-full rounded-xl bg-black" />
      <button type="button" disabled={!ready} onClick={capture} className="mx-auto mt-3 flex items-center gap-2 rounded-full bg-pl-accent px-4 py-2 text-pl-bg disabled:opacity-50"><CameraIcon />Capture</button>
    </div>
  </div>;
}
