import { useState } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { DownloadIcon, FileTextIcon } from "lucide-react";
import toast from "react-hot-toast";
import { loadFileBytes } from "../lib/photos";
import { useAuthStore } from "../store/useAuthStore";

const saver = registerPlugin("DocumentSaver");

export default function DocumentAttachment({ message }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const { authUser, encryptionIdentity } = useAuthStore.getState();
      const bytes = await loadFileBytes(message, authUser._id, encryptionIdentity);
      const name = message.file.name.replace(/[/\\]/g, "_") || "attachment";
      if (Capacitor.getPlatform() === "android") {
        await saver.save({ name, bytes });
      } else {
        const blob = new Blob([Uint8Array.from(atob(bytes), c => c.charCodeAt(0))], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      toast.error(error.message || "Could not save the document.");
    } finally {
      setBusy(false);
    }
  }

  return <button type="button" onClick={download} disabled={busy || message.isOptimistic} aria-label={`Download ${message.file.name}`}
    className={`flex max-w-full items-center gap-2 rounded-lg bg-black/15 p-2 text-left disabled:opacity-60 ${message.text ? "" : "mb-5"}`}>
    <FileTextIcon className="size-5 shrink-0 text-pl-blue" />
    <span className="min-w-0"><span className="block truncate text-sm font-semibold">{message.file.name}</span>
      <span className="block text-xs text-pl-muted">{Math.ceil(message.file.size / 1024)} KiB</span></span>
    <DownloadIcon className="size-4 shrink-0" />
  </button>;
}
