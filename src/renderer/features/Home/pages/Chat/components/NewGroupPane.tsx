import { Avatar } from '@/shared/components';
import { MeetingService } from '@/shared/services/Meeting';
import type { Contact } from '@/shared/services/Friend/FriendService';
import { useEffect, useMemo, useRef, useState } from 'react';
import { matches } from '../hooks';

interface Props {
  people: Contact[];
  myId: number;
  onCreate: (name: string, members: Contact[]) => Promise<void>;
}

/** "Nhóm chat mới": name the group, pick at least two people, "Xong". */
export function NewGroupPane({ people, myId, onCreate }: Props) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Contact[]>([]);
  const [remote, setRemote] = useState<Contact[]>([]);
  const [creating, setCreating] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => nameRef.current?.focus(), []);

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

  const shown = useMemo(() => {
    const local = people.filter(
      (p) => matches(p.fullName, query) || matches(p.email, query),
    );
    const ids = new Set(local.map((p) => p.id));
    return [...local, ...remote.filter((p) => !ids.has(p.id))];
  }, [people, remote, query]);

  const isPicked = (p: Contact) => picked.some((x) => x.id === p.id);
  const toggle = (p: Contact) =>
    setPicked((list) =>
      isPicked(p) ? list.filter((x) => x.id !== p.id) : [...list, p],
    );

  // Same rule as mobile: a group is me plus at least two people.
  const canCreate = !!name.trim() && picked.length >= 2 && !creating;

  const create = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      await onCreate(name.trim(), picked);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="chat-thread">
      <div className="chat-group-header">
        <label className="chat-to" htmlFor="chat-group-name">
          <span>Tên nhóm:</span>
          <input
            id="chat-group-name"
            ref={nameRef}
            placeholder="Gõ tên nhóm"
            value={name}
            maxLength={100}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="chat-group-done"
          disabled={!canCreate}
          title={
            picked.length < 2 ? 'Chọn ít nhất 2 thành viên' : 'Tạo nhóm chat'
          }
          onClick={create}
        >
          Xong
        </button>
      </div>
      <div className="chat-group-members">
        {picked.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chat-group-chip"
            title="Bỏ chọn"
            onClick={() => toggle(p)}
          >
            {p.fullName ?? p.email}
          </button>
        ))}
        <input
          className="chat-group-search"
          placeholder="Gõ tên thành viên trong nhóm chat"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="chat-group-list">
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chat-person"
            aria-pressed={isPicked(p)}
            onClick={() => toggle(p)}
          >
            <Avatar
              url={p.avatarUrl ?? ''}
              radius={24}
              name={p.fullName ?? '?'}
            />
            <span className="chat-person-text">
              <b>{p.fullName}</b>
              <small>{p.email}</small>
            </span>
            <span className={`chat-radio ${isPicked(p) ? 'on' : ''}`} />
          </button>
        ))}
        {shown.length === 0 && (
          <div className="chat-empty">
            {query.trim().length >= 3
              ? 'Không tìm thấy người dùng nào'
              : 'Gõ tên hoặc email để tìm thêm người'}
          </div>
        )}
      </div>
    </div>
  );
}
