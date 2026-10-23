import { MeetingService } from '@/shared/services/Meeting';
import type { User } from '@/shared/types/user';
import { useEffect, useRef, useState } from 'react';
import { Avatar } from '../Avatar/Avatar';

interface Props {
  placeholder: string;
  /** People already picked (shown below, removable). */
  value: User[];
  onChange: (users: User[]) => void;
  /** Never offered (e.g. the host, or people picked in the other list). */
  excludeIds?: number[];
}

const SEARCH_DELAY_MS = 300;

/** Find people by email (as you type) and collect them into a list. */
export function UserPicker({
  placeholder,
  value,
  onChange,
  excludeIds = [],
}: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const requestId = useRef(0);

  const pickedIds = value.map((u) => u.id);
  const offered = results.filter(
    (u) => u.id && !pickedIds.includes(u.id) && !excludeIds.includes(u.id),
  );

  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) {
      setResults([]);
      return undefined;
    }
    requestId.current += 1;
    const id = requestId.current;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await MeetingService.searchUsers(text);
        if (id === requestId.current) setResults(res.rows ?? []);
      } catch (_) {
        if (id === requestId.current) setResults([]);
      } finally {
        if (id === requestId.current) setSearching(false);
      }
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const pick = (user: User) => {
    onChange([...value, user]);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  // "Add": the exact email match, else the only match.
  const addTyped = () => {
    const text = query.trim().toLowerCase();
    const match =
      offered.find((u) => u.email?.toLowerCase() === text) ??
      (offered.length === 1 ? offered[0] : undefined);
    if (match) pick(match);
    else setOpen(true);
  };

  const showList = open && query.trim().length >= 3;

  return (
    <div className="user-picker">
      <div className="user-picker-row">
        <input
          className="setup-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Let a click on a result land before the list closes.
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addTyped();
            }
          }}
        />
        <button
          type="button"
          className="setup-button primary small"
          disabled={!query.trim()}
          onClick={addTyped}
        >
          Add
        </button>
      </div>
      {showList && (
        <div className="user-picker-results">
          {offered.map((user) => (
            <button
              key={user.id}
              type="button"
              className="user-card"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(user)}
            >
              <Avatar
                url={user.avatarUrl ?? ''}
                radius={24}
                name={user.fullName ?? ''}
              />
              <span className="user-card-text">
                <strong>{user.fullName}</strong>
                <small>{user.email}</small>
              </span>
            </button>
          ))}
          {offered.length === 0 && (
            <div className="user-picker-empty">
              {searching ? 'Đang tìm…' : 'Không tìm thấy người dùng nào'}
            </div>
          )}
        </div>
      )}
      {value.length > 0 && (
        <div className="user-picker-picked">
          {value.map((user) => (
            <span key={user.id} className="user-picker-chip">
              {user.fullName || user.email}
              <button
                type="button"
                aria-label={`Bỏ ${user.fullName || user.email}`}
                onClick={() => onChange(value.filter((u) => u.id !== user.id))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
