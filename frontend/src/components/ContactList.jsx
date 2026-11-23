import { useEffect, useMemo, useState } from "react";
import { CheckIcon, CopyIcon, UserPlusIcon, XIcon } from "lucide-react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import Avatar from "./Avatar";

function ContactList() {
  const getConnections = useChatStore((s) => s.getAllContacts);
  const connectionInfo = useChatStore((s) => s.connectionInfo);
  const requestConnection = useChatStore((s) => s.requestConnection);
  const acceptConnection = useChatStore((s) => s.acceptConnection);
  const removeConnection = useChatStore((s) => s.removeConnection);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const isUsersLoading = useChatStore((s) => s.isUsersLoading);
  const search = useChatStore((s) => s.search);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => { getConnections(); }, [getConnections]);
  const connected = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? connectionInfo.connected.filter((person) => person.fullName.toLowerCase().includes(term)) : connectionInfo.connected;
  }, [connectionInfo.connected, search]);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(connectionInfo.code); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* code remains selectable */ }
  };

  if (isUsersLoading && !connectionInfo.code) return <UsersLoadingSkeleton />;
  return (
    <div className="space-y-5 px-4 py-4">
      <section className="rounded-2xl border border-pl-line bg-pl-header p-4">
        <p className="text-sm font-medium text-pl-text">Your private connection code</p>
        <p className="mt-1 text-xs text-pl-muted">Share this only with people you want to chat with.</p>
        <div className="mt-3 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-pl-panel px-3 py-2.5 text-sm font-semibold tracking-wide text-pl-text">{connectionInfo.code || "Creating code…"}</code>
          <button type="button" onClick={copyCode} disabled={!connectionInfo.code} aria-label="Copy connection code" className="rounded-xl bg-pl-accent p-2.5 text-pl-bg disabled:opacity-50">
            {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
          </button>
        </div>
      </section>

      <section>
        <p className="mb-2 text-sm font-medium text-pl-text">Connect with someone</p>
        <form onSubmit={async (event) => { event.preventDefault(); if (await requestConnection(code)) setCode(""); }} className="flex gap-2">
          <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="P-XXXXXXXXXXXXXX" className="min-w-0 flex-1 rounded-xl border border-pl-line bg-pl-header px-3 py-2.5 text-sm text-pl-text uppercase outline-none focus:ring-1 focus:ring-pl-accent" />
          <button type="submit" disabled={!code} className="rounded-xl bg-pl-accent px-3 text-pl-bg disabled:opacity-50" aria-label="Send connection request"><UserPlusIcon className="size-4" /></button>
        </form>
      </section>

      {connectionInfo.incoming.length > 0 && <section><p className="mb-2 text-sm font-medium text-pl-text">Requests for you</p><div className="space-y-2">{connectionInfo.incoming.map((person) => <div key={person.connectionId} className="flex items-center gap-3 rounded-2xl bg-pl-header p-3"><Avatar src={person.profilePic} name={person.fullName} size="size-10" /><span className="min-w-0 flex-1 truncate text-sm text-pl-text">{person.fullName}</span><button type="button" onClick={() => acceptConnection(person.connectionId)} className="rounded-lg bg-pl-accent p-2 text-pl-bg" aria-label={`Accept ${person.fullName}`}><CheckIcon className="size-4" /></button><button type="button" onClick={() => removeConnection(person.connectionId)} className="rounded-lg p-2 text-pl-muted hover:bg-pl-hover" aria-label={`Decline ${person.fullName}`}><XIcon className="size-4" /></button></div>)}</div></section>}
      {connectionInfo.outgoing.length > 0 && <section><p className="mb-2 text-sm font-medium text-pl-text">Pending requests</p><div className="space-y-2">{connectionInfo.outgoing.map((person) => <div key={person.connectionId} className="flex items-center gap-3 rounded-2xl bg-pl-header p-3"><Avatar src={person.profilePic} name={person.fullName} size="size-10" /><span className="min-w-0 flex-1 truncate text-sm text-pl-text">{person.fullName}</span><span className="text-xs text-pl-muted">Pending</span><button type="button" onClick={() => removeConnection(person.connectionId)} className="p-2 text-pl-muted" aria-label={`Cancel request to ${person.fullName}`}><XIcon className="size-4" /></button></div>)}</div></section>}
      <section><p className="mb-2 text-sm font-medium text-pl-text">Connected</p>{connected.length === 0 ? <p className="rounded-2xl bg-pl-header px-4 py-5 text-center text-sm text-pl-muted">No connections yet. Share your code to start privately.</p> : <ul className="space-y-1">{connected.map((person) => <li key={person._id}><button type="button" onClick={() => setSelectedUser(person)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-pl-hover"><Avatar src={person.profilePic} name={person.fullName} size="size-[46px]" online={onlineUsers.includes(person._id)} /><span className="min-w-0 flex-1 truncate text-[16px] text-pl-text">{person.fullName}</span></button></li>)}</ul>}</section>
    </div>
  );
}
export default ContactList;
