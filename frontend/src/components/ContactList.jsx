import { useEffect, useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import UsersLoadingSkeleton from "./UsersLoadingSkeleton";
import Avatar from "./Avatar";

function ContactList() {
  const getAllContacts = useChatStore((s) => s.getAllContacts);
  const allContacts = useChatStore((s) => s.allContacts);
  const setSelectedUser = useChatStore((s) => s.setSelectedUser);
  const isUsersLoading = useChatStore((s) => s.isUsersLoading);
  const search = useChatStore((s) => s.search);
  const onlineUsers = useAuthStore((s) => s.onlineUsers);

  useEffect(() => {
    getAllContacts();
  }, [getAllContacts]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? allContacts.filter((c) => c.fullName.toLowerCase().includes(term)) : allContacts;
  }, [allContacts, search]);

  if (isUsersLoading && allContacts.length === 0) return <UsersLoadingSkeleton />;

  if (allContacts.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-pl-muted">No other users have signed up yet.</p>;
  }
  if (visible.length === 0) {
    return <p className="px-6 py-10 text-center text-sm text-pl-muted">No contacts match “{search.trim()}”.</p>;
  }

  return (
    <ul>
      {visible.map((contact) => {
        const online = onlineUsers.includes(contact._id);
        return (
          <li key={contact._id}>
            <button
              type="button"
              onClick={() => setSelectedUser(contact)}
              className="flex w-full items-center gap-3 pl-3 text-left transition-colors hover:bg-pl-hover"
            >
              <Avatar src={contact.profilePic} name={contact.fullName} size="size-[49px]" online={online} />
              <div className="min-w-0 flex-1 border-b border-pl-line py-3.5 pr-3">
                <h4 className="truncate text-[17px] text-pl-text">{contact.fullName}</h4>
                <p className={`text-sm ${online ? "text-pl-accent" : "text-pl-muted"}`}>
                  {online ? "online" : "offline"}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
export default ContactList;
