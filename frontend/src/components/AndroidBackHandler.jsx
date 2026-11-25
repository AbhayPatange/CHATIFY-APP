import { useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import { useCallStore } from "../store/useCallStore";

export default function AndroidBackHandler() {
  useEffect(() => {
    const handleBack = (event) => {
      // Leave an ongoing call active when navigating back.
      const minimize = document.querySelector('button[aria-label="Minimize call to chat"]');
      if (minimize) { minimize.click(); event.preventDefault(); return; }
      const dialog = [...document.querySelectorAll('[role="dialog"]')].at(-1);
      if (dialog) {
        const close = dialog.querySelector('button[aria-label^="Close"], button[aria-label="Cancel reply"]');
        if (close) close.click();
        else [...dialog.querySelectorAll("button")].find((button) => button.textContent.trim() === "Cancel")?.click();
        event.preventDefault();
        return;
      }
      const chat = useChatStore.getState();
      if (chat.profileUser) { chat.setProfileUser(null); event.preventDefault(); return; }
      if (useCallStore.getState().isHistoryOpen) { useCallStore.getState().closeCallHistory(); event.preventDefault(); return; }
      if (chat.replyTo) { chat.setReplyTo(null); event.preventDefault(); return; }
      if (chat.selectedUser) { chat.setSelectedUser(null); event.preventDefault(); return; }
      if (chat.activeTab !== "chats") { chat.setActiveTab("chats"); event.preventDefault(); return; }
      // Do not send an active call into the background by accident.
      if (useCallStore.getState().status !== "idle") event.preventDefault();
    };
    window.addEventListener("pinglet:back", handleBack);
    return () => window.removeEventListener("pinglet:back", handleBack);
  }, []);
  return null;
}
