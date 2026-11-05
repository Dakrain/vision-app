import { useAppSelector } from '@/renderer/store/hooks';
import { selectAuth } from '@/renderer/shared/store/auth/selector';
import { notification } from 'antd';
import {
  createContext,
  useCallback,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { signInAsUser, signOut, uidFor } from '../services/Firebase/app';
import { osNotify } from '../utils/osNotify';
import { AUTO_RETRIES, type SocialStatus, retryDelayMs } from './connect';
import {
  Conversation,
  Me,
  conversationTitle,
  localizedChatText,
  upsertUserMirror,
  watchConversations,
} from '../services/Firebase/chat';

interface SocialState {
  /** Signed in to Firebase as the current Vision user. */
  me?: Me;
  /** Sign-in progress; 'failed' after the automatic retries ran out. */
  status: SocialStatus;
  /** Try signing in again now (the Chat page's "Thử lại"). */
  retry: () => void;
  conversations: Conversation[];
  unreadTotal: number;
  /** Conversation open on screen (no toast, auto mark-read). */
  activeConversationId?: string;
  setActiveConversationId: (id?: string) => void;
}

const SocialContext = createContext<SocialState>({
  status: 'connecting',
  retry: () => {},
  conversations: [],
  unreadTotal: 0,
  setActiveConversationId: () => {},
});

export const useSocial = () => useContext(SocialContext);

/**
 * Firebase session + live conversation list for chat and calls. Mounted
 * once for the whole app so new messages are noticed on any screen.
 */
export function SocialProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSelector(selectAuth);
  const [me, setMe] = useState<Me>();
  const [failed, setFailed] = useState(false);
  // Bumped to sign in again after a failure.
  const [attemptKey, setAttemptKey] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const activeRef = useRef<string>();
  activeRef.current = activeConversationId;

  // Sign in/out of Firebase with the Vision session.
  useEffect(() => {
    const backendId = user?.id;
    if (!backendId) {
      setMe(undefined);
      setConversations([]);
      signOut().catch(() => {});
      return undefined;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const profile: Me = {
      uid: uidFor(backendId),
      backendId,
      displayName: user?.fullName,
      avatarUrl: user?.avatarUrl,
    };
    setFailed(false);
    // A failed sign-in (network, cold Cloud Function) retries with backoff,
    // then the Chat page offers "Thử lại" — desktop has no reload.
    const attempt = async (n: number) => {
      try {
        await signInAsUser(backendId);
      } catch (e) {
        console.warn('[social] Firebase sign-in failed', e);
        if (cancelled) return;
        if (n < AUTO_RETRIES) {
          timer = setTimeout(() => attempt(n + 1), retryDelayMs(n));
        } else {
          setFailed(true);
        }
        return;
      }
      if (cancelled) return;
      await upsertUserMirror(profile).catch(() => {});
      if (!cancelled) setMe(profile);
    };
    attempt(0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [user?.id, user?.fullName, user?.avatarUrl, attemptKey]);

  const retry = useCallback(() => setAttemptKey((k) => k + 1), []);

  // Back online after giving up: try again by itself.
  useEffect(() => {
    if (!failed) return undefined;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [failed, retry]);

  // Live conversation list + a toast for messages arriving elsewhere.
  const lastSeen = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!me) return undefined;
    let first = true;
    return watchConversations(me.backendId, (all) => {
      // Someone opened a chat with me but sent nothing yet: not a
      // conversation for me until the first message.
      const list = all.filter(
        (c) =>
          c.type !== 'direct' || !!c.lastMessage || c.members.includes(me.uid),
      );
      setConversations(list);
      list.forEach((c) => {
        const at = c.lastMessageAt?.getTime() ?? 0;
        const before = lastSeen.current[c.id];
        lastSeen.current[c.id] = at;
        if (first || before === undefined || at <= before) return;
        if (c.lastMessageBy === me.uid || c.id === activeRef.current) return;
        const title = conversationTitle(c, me.backendId);
        // Stored labels ("[Hình ảnh]"…) in the app language.
        const text = localizedChatText(c.lastMessage ?? '');
        notification.info({
          message: title,
          description: text,
          placement: 'bottomRight',
          duration: 4,
        });
        // Window minimised or behind others: a system notification too.
        osNotify(title, text);
      });
      first = false;
    });
  }, [me]);

  const unreadTotal = useMemo(
    () =>
      me
        ? conversations.reduce(
            (sum, c) => sum + (c.unreadCounts[String(me.backendId)] ?? 0),
            0,
          )
        : 0,
    [conversations, me],
  );

  let status: SocialStatus = failed ? 'failed' : 'connecting';
  if (me) status = 'connected';
  const value = useMemo(
    (): SocialState => ({
      me,
      status,
      retry,
      conversations,
      unreadTotal,
      activeConversationId,
      setActiveConversationId,
    }),
    [me, status, retry, conversations, unreadTotal, activeConversationId],
  );

  return (
    <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
  );
}
