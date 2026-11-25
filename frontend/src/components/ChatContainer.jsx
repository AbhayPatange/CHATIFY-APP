import { useEffect, useRef, useState } from "react";
import { LoaderIcon, ReplyIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { formatDayLabel, formatTime, isSameDay } from "../lib/time";
import ChatHeader from "./ChatHeader";
import NoChatHistoryPlaceholder from "./NoChatHistoryPlaceholder";
import DocumentAttachment from "./DocumentAttachment";
import MessageInput from "./MessageInput";
import MessagesLoadingSkeleton from "./MessagesLoadingSkeleton";
import MessageStatus from "./MessageStatus";

function ChatContainer() {
  const selectedUser = useChatStore((s) => s.selectedUser);
  const messages = useChatStore((s) => s.messages);
  const isMessagesLoading = useChatStore((s) => s.isMessagesLoading);
  const hasMoreMessages = useChatStore((s) => s.hasMoreMessages);
  const isLoadingOlder = useChatStore((s) => s.isLoadingOlder);
  const getMessagesByUserId = useChatStore((s) => s.getMessagesByUserId);
  const loadOlderMessages = useChatStore((s) => s.loadOlderMessages);
  const markChatSeen = useChatStore((s) => s.markChatSeen);
  const setReplyTo = useChatStore((s) => s.setReplyTo);
  const authUser = useAuthStore((s) => s.authUser);
  const messageEndRef = useRef(null);
  const messageListRef = useRef(null);
  const prevLastId = useRef(undefined);
  const swipeStart = useRef({});
  const [swipe, setSwipe] = useState({ id: null, offset: 0 });

  const selectedUserId = selectedUser._id;

  // keyed on the id (not the object) so refreshing the chat list doesn't reload the conversation
  useEffect(() => {
    prevLastId.current = undefined;
    getMessagesByUserId(selectedUserId);
  }, [selectedUserId, getMessagesByUserId]);

  // opening a chat (or coming back to the tab) reads it -> sender's ticks turn blue
  useEffect(() => {
    if (!isMessagesLoading) markChatSeen();
  }, [isMessagesLoading, messages.length, markChatSeen]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && markChatSeen();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [markChatSeen]);

  // scroll only when a *new* message is appended, not when older ones are prepended;
  // jump instantly when a conversation first opens, glide for live messages
  const lastMessageId = messages[messages.length - 1]?._id;
  useEffect(() => {
    if (!lastMessageId) return;
    const first = prevLastId.current === undefined;
    const list = messageListRef.current;
    if (list) list.scrollTo({ top: list.scrollHeight, behavior: first ? "auto" : "smooth" });
    prevLastId.current = lastMessageId;
  }, [lastMessageId]);

  const showMessages = messages.length > 0 && !isMessagesLoading;

  return (
    <>
      <ChatHeader />

      <div ref={messageListRef} className="chat-wallpaper min-h-0 flex-1 overflow-y-auto px-3 py-3 md:px-[6%]">
        {showMessages ? (
          <div className="mx-auto flex max-w-4xl flex-col">
            {hasMoreMessages && (
              <div className="mb-2 text-center">
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  disabled={isLoadingOlder}
                  className="rounded-lg bg-pl-chip px-3 py-1.5 text-xs text-pl-accent hover:brightness-125 disabled:opacity-60"
                >
                  {isLoadingOlder ? <LoaderIcon className="inline size-4 animate-spin" /> : "Load older messages"}
                </button>
              </div>
            )}

            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const mine = msg.senderId === authUser._id;
              const newDay = !prev || !isSameDay(prev.createdAt, msg.createdAt);
              const startsRun = newDay || prev.senderId !== msg.senderId;
              const imageOnly = msg.image && !msg.text;

              const meta = (
                <span
                  className={`flex items-center gap-1 text-[11px] leading-none ${
                    imageOnly ? "text-white" : "text-pl-muted"
                  }`}
                >
                  <time dateTime={msg.createdAt}>{formatTime(msg.createdAt)}</time>
                  {mine && <MessageStatus status={msg.status || "seen"} className={imageOnly ? "text-white/80" : "text-pl-muted"} />}
                </span>
              );

              return (
                <div key={msg._id}>
                  {newDay && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-lg bg-pl-chip px-3 py-1.5 text-xs text-pl-muted shadow-sm">
                        {formatDayLabel(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  <div className={`group relative flex items-center gap-2 ${mine ? "justify-end" : "justify-start"} ${startsRun ? "mt-2" : "mt-0.5"}`}>
                    {swipe.id === msg._id && <ReplyIcon className={`absolute top-1/2 size-5 -translate-y-1/2 text-pl-accent ${mine ? "right-3" : "left-3"}`} style={{ opacity: Math.min(Math.abs(swipe.offset) / 48, 1) }} />}
                    {mine && !msg.isOptimistic && <button type="button" onClick={() => setReplyTo(msg)} aria-label="Reply to your message" className="hidden rounded-full p-2 text-pl-muted hover:bg-pl-selected hover:text-pl-text focus:opacity-100 md:block md:opacity-0 md:group-hover:opacity-100"><ReplyIcon className="size-4" /></button>}
                    <div
                      onTouchStart={(event) => {
                        const touch = event.touches[0];
                        swipeStart.current[msg._id] = touch ? { x: touch.clientX, y: touch.clientY } : null;
                        setSwipe({ id: msg._id, offset: 0 });
                      }}
                      onTouchMove={(event) => {
                        const start = swipeStart.current[msg._id];
                        const touch = event.touches[0];
                        if (!start || !touch) return;
                        const distance = touch.clientX - start.x;
                        const vertical = Math.abs(touch.clientY - start.y);
                        if (vertical > Math.abs(distance)) return;
                        setSwipe({ id: msg._id, offset: mine ? Math.max(-88, Math.min(0, distance)) : Math.max(0, Math.min(distance, 88)) });
                      }}
                      onTouchEnd={(event) => {
                        const start = swipeStart.current[msg._id];
                        const touch = event.changedTouches[0];
                        const distance = touch && start ? touch.clientX - start.x : 0;
                        const vertical = touch && start ? Math.abs(touch.clientY - start.y) : 0;
                        if (!msg.isOptimistic && vertical < Math.abs(distance) && (mine ? distance < -64 : distance > 64)) setReplyTo(msg);
                        delete swipeStart.current[msg._id];
                        setSwipe({ id: null, offset: 0 });
                      }}
                      onTouchCancel={() => { delete swipeStart.current[msg._id]; setSwipe({ id: null, offset: 0 }); }}
                      style={{ transform: swipe.id === msg._id ? `translateX(${swipe.offset}px)` : undefined }}
                      className={`bubble touch-pan-y transition-transform ${mine ? "bubble-out mr-2" : "bubble-in ml-2"} ${startsRun ? "has-tail" : ""} ${
                        msg.image ? "p-1" : "px-2.5 py-1.5"
                      }`}
                    >
                      {msg.replyTo && <div className="mb-1.5 truncate rounded border-l-2 border-pl-accent bg-black/10 px-2 py-1 text-xs text-pl-muted">↩ {messages.find((m) => m._id === msg.replyTo.messageId)?.text || "Reply to a message"}</div>}
                      {msg.file && <DocumentAttachment message={msg} />}
                      {msg.image && (
                        <img
                          src={msg.image}
                          alt="Shared"
                          loading="lazy"
                          className="max-h-80 w-full rounded-md object-cover"
                        />
                      )}

                      {msg.text && (
                        <p className={`whitespace-pre-wrap break-words text-[14.5px] leading-[1.35] ${msg.image ? "px-1.5 pt-1.5 pb-0.5" : ""}`}>
                          {msg.text}
                          {/* reserves room so the time/ticks never overlap the last line */}
                          <span aria-hidden className={`inline-block h-0 ${mine ? "w-[86px]" : "w-[62px]"}`} />
                        </p>
                      )}

                      {imageOnly ? (
                        <span className="absolute bottom-2 right-2.5 rounded-full bg-black/45 px-1.5 py-1">{meta}</span>
                      ) : (
                        <span className={`absolute bottom-1 ${msg.image ? "right-2.5" : "right-2"}`}>{meta}</span>
                      )}
                    </div>
                    {!mine && !msg.isOptimistic && <button type="button" onClick={() => setReplyTo(msg)} aria-label="Reply to message" className="hidden rounded-full p-2 text-pl-muted hover:bg-pl-selected hover:text-pl-text focus:opacity-100 md:block md:opacity-0 md:group-hover:opacity-100"><ReplyIcon className="size-4" /></button>}
                  </div>
                </div>
              );
            })}
            <div ref={messageEndRef} />
          </div>
        ) : isMessagesLoading ? (
          <MessagesLoadingSkeleton />
        ) : (
          <NoChatHistoryPlaceholder name={selectedUser.fullName} />
        )}
      </div>

      <MessageInput key={selectedUserId} />
    </>
  );
}

export default ChatContainer;
