import FriendService, {
  type Contact,
} from '@/shared/services/Friend/FriendService';
import { useCallback, useEffect, useState } from 'react';

/** navigator.onLine, kept current. */
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** My contacts ("Danh bạ"), loaded once per Chat page visit. */
export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setContacts(await FriendService.fetchContacts());
      setFailed(false);
    } catch (_) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { contacts, loading, failed, reload: load };
}

/** Case- and accent-insensitive "contains". */
export const matches = (text: string | undefined, query: string) => {
  const fold = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  return fold(text ?? '').includes(fold(query.trim()));
};
