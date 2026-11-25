import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CameraIcon, ImageIcon, ReplyIcon, SendIcon, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { prepareChatPhoto } from "../lib/image";

import PhotoCamera from "./PhotoCamera";

const MAX_LENGTH = 2000;

function MessageInput() {
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const photoId = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const cameraRef = useRef(null);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const textareaRef = useRef(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const replyTo = useChatStore((s) => s.replyTo);
  const setReplyTo = useChatStore((s) => s.setReplyTo);

  // grow with the text (up to ~5 lines), like a phone chat box
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const canSend = Boolean(text.trim() || imagePreview);

  const submit = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    try {
      if (await sendMessage({ text: text.trim(), image: imagePreview || undefined, photoId: photoId.current })) {
        setText("");
        setImagePreview(null);
        textareaRef.current?.focus();
      }
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submit();
  };

  // Enter sends, Shift+Enter adds a new line
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return; // user cancelled the picker

    e.target.value = "";
    await prepare(file);
  };

  const prepare = async (file) => {
    setBusy(true);
    try {
      const prepared = await prepareChatPhoto(file);
      photoId.current = crypto.randomUUID();
      setImagePreview(prepared);
    } catch (error) {
      toast.error(error.message || "Could not open that photo.");
    } finally {
      setBusy(false);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="shrink-0 border-t border-pl-line bg-pl-panel px-3 py-3 md:px-5">
      {cameraOpen && <PhotoCamera onClose={() => setCameraOpen(false)} onPhoto={(file) => { setCameraOpen(false); prepare(file); }} />}
      {replyTo && <div className="mb-2 flex items-center gap-2 rounded-lg border-l-4 border-pl-accent bg-pl-selected px-3 py-2 text-sm"><ReplyIcon className="size-4 text-pl-accent" /><span className="min-w-0 flex-1 truncate text-pl-muted">Replying to: {replyTo.text || "Photo"}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="text-pl-muted hover:text-pl-text"><XIcon className="size-4" /></button></div>}
      {imagePreview && (
        <div className="mb-2 flex items-center">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="size-20 rounded-lg border border-pl-line object-cover" />
            <button
              onClick={removeImage}
              disabled={busy}
              aria-label="Remove image"
              className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-pl-selected text-pl-text hover:bg-pl-line"
              type="button"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
          tabIndex={-1}
        />

        <input type="file" accept="image/*" capture="environment" ref={cameraRef} onChange={handleImageChange} hidden />
        <div className="relative" onKeyDown={(event) => { if (event.key === "Escape") setChoosingPhoto(false); }}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setChoosingPhoto(false); }}>
          {choosingPhoto && <div className="absolute bottom-full left-0 z-20 mb-2 w-52 rounded-2xl border border-pl-line bg-pl-panel p-1.5 shadow-xl">
            <button type="button" onClick={() => { if (window.matchMedia("(pointer: coarse)").matches) cameraRef.current.click();
              else setCameraOpen(true);
              setChoosingPhoto(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-pl-hover"><CameraIcon className="size-5 text-pl-blue" />Take a photo</button>
            <button type="button" onClick={() => { fileInputRef.current.click(); setChoosingPhoto(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-pl-hover"><ImageIcon className="size-5 text-pl-blue" />Choose from gallery</button>
          </div>}
          <button type="button" aria-label="Attach a photo" title="Attach a photo" aria-expanded={choosingPhoto} disabled={busy}
            onClick={() => setChoosingPhoto(!choosingPhoto)} className="grid size-11 place-items-center rounded-full bg-pl-chip text-pl-blue hover:bg-pl-selected">
            <CameraIcon className="size-5" />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          readOnly={busy}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          aria-label="Message"
          autoComplete="off"
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setText(e.target.value);
          }}
          className="max-h-[120px] min-w-0 flex-1 resize-none rounded-2xl border border-pl-line bg-pl-header focus:border-pl-blue px-4 py-[11px] text-[15px] leading-[1.35] text-pl-text placeholder-pl-muted focus:outline-none"
          placeholder="Type a message"
        />

        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend || busy}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-pl-accent text-pl-bg transition-colors hover:bg-pl-accentDark disabled:bg-pl-selected disabled:text-pl-muted"
        >
          <SendIcon className="size-5" />
        </button>
      </form>
    </div>
  );
}
export default MessageInput;
