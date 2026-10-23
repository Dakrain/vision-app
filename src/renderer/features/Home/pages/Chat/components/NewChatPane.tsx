import { Avatar } from '@/shared/components';
import { MeetingService } from '@/shared/services/Meeting';
import type { Contact } from '@/shared/services/Friend/FriendService';
import { useEffect, useMemo, useRef, useState } from 'react';
import { matches } from '../hooks';

interface Props {
  people: Contact[];
  myId: number;
  onPick: (person: Contact) => void;
}

/** "Tin nhắn mới": type a name (contacts) or an email (anyone) after "Đến:". */
export function NewChatPane({ people, myId, onPick }: Props) {
  const [query, setQuery] = useState('');
  const [remote, setRemote] = useState<Contact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => inputRef.current?.focus(), []);

  // Anyone by email prefix, besides my contacts.
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setRemote([]);
      return undefined;
    }
    requestId.current += 1;
    const id = requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await MeetingService.searchUsers(text);
        if (id !== requestId.current) return;
        setRemote(
          (res.rows ?? [])
            .filter((u) => u.id && u.id !== myId)
            .map((u) => ({
              id: u.id!,
              fullName: u.fullName,
              email: u.email,
              avatarUrl: u.avatarUrl,
            })),
        );
      } catch (_) {
        if (id === requestId.current) setRemote([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, myId]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const local = people.filter(
      (p) => matches(p.fullName, query) || matches(p.email, query),
    );
    const ids = new Set(local.map((p) => p.id));
    return [...local, ...remote.filter((p) => !ids.has(p.id))].slice(0, 8);
  }, [people, remote, query]);

  return (
    <div className="chat-thread">
      <div className="chat-thread-header to">
        <label className="chat-to" htmlFor="chat-to-input">
          <span>Đến:</span>
          <input
            id="chat-to-input"
            ref={inputRef}
            placeholder="Gõ tên cá nhân bạn muốn chat"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestions[0]) onPick(suggestions[0]);
            }}
          />
        </label>
        {suggestions.length > 0 && (
          <div className="chat-to-suggestions">
            {suggestions.map((p) => (
              <button
                key={p.id}
                type="button"
                className="chat-person"
                onClick={() => onPick(p)}
              >
                <Avatar
                  url={p.avatarUrl ?? ''}
                  radius={20}
                  name={p.fullName ?? '?'}
                />
                <span className="chat-person-text">
                  <b>{p.fullName}</b>
                  <small>{p.email}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="chat-thread-body empty" />
    </div>
  );
}
