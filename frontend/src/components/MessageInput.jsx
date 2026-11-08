import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { PaperclipIcon, SendIcon, XIcon } from "lucide-react";
import useKeyboardSound from "../hooks/useKeyboardSound";
import { useChatStore } from "../store/useChatStore";
import { readFileAsDataURL, validateImageFile } from "../lib/image";

const MAX_LENGTH = 2000;

function MessageInput() {
  const { playRandomKeyStrokeSound } = useKeyboardSound();
  const [text, setText] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const sendMessage = useChatStore((s) => s.sendMessage);
  const isSoundEnabled = useChatStore((s) => s.isSoundEnabled);

  // grow with the text (up to ~5 lines), like a phone chat box
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const canSend = Boolean(text.trim() || imagePreview);

  const submit = () => {
    if (!canSend) return;
    if (isSoundEnabled) playRandomKeyStrokeSound();

    sendMessage({ text: text.trim(), image: imagePreview || undefined });
    setText("");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    textareaRef.current?.focus();
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

    const problem = validateImageFile(file);
    if (problem) {
      toast.error(problem);
      e.target.value = "";
      return;
    }

    try {
      setImagePreview(await readFileAsDataURL(file));
    } catch {
      toast.error("Could not read that image");
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="shrink-0 bg-pl-header px-2 py-2 md:px-4">
      {imagePreview && (
        <div className="mb-2 flex items-center">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="size-20 rounded-lg border border-pl-line object-cover" />
            <button
              onClick={removeImage}
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
          accept="image/png,image/jpeg,image/gif,image/webp"
          ref={fileInputRef}
          onChange={handleImageChange}
          className="hidden"
          tabIndex={-1}
        />

        <button
          type="button"
          aria-label="Attach image"
          title="Attach image"
          onClick={() => fileInputRef.current?.click()}
          className={`grid size-11 shrink-0 place-items-center rounded-full transition-colors hover:bg-pl-selected ${
            imagePreview ? "text-pl-accent" : "text-pl-muted hover:text-pl-text"
          }`}
        >
          <PaperclipIcon className="size-5" />
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          maxLength={MAX_LENGTH}
          aria-label="Message"
          autoComplete="off"
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setText(e.target.value);
            if (isSoundEnabled) playRandomKeyStrokeSound();
          }}
          className="max-h-[120px] min-w-0 flex-1 resize-none rounded-3xl bg-pl-selected px-4 py-[11px] text-[15px] leading-[1.35] text-pl-text placeholder-pl-muted focus:outline-none"
          placeholder="Type a message"
        />

        <button
          type="submit"
          aria-label="Send message"
          disabled={!canSend}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-pl-accent text-pl-bg transition-colors hover:bg-[#06cf9c] disabled:bg-pl-selected disabled:text-pl-muted"
        >
          <SendIcon className="size-5" />
        </button>
      </form>
    </div>
  );
}
export default MessageInput;
