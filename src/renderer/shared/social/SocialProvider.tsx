import { useAppSelector } from '@/renderer/store/hooks';
import { selectAuth } from '@/renderer/shared/store/auth/selector';
import { notification } from 'antd';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { signInAsUser, signOut, uidFor } from '../services/Firebase/app';
import {
  Conversation,
  Me,
  conversationTitle,
  upsertUserMirror,
  watchConversations,
} from '../services/Firebase/chat';

interface SocialState {
  /** Signed in to Firebase as the current Vision user. */
  me?: Me;
  conversations: Conversation[];
  unreadTotal: number;
  /** Conversation open on screen (no toast, auto mark-read). */
  activeConversationId?: string;
  setActiveConversationId: (id?: string) => void;
}

const SocialContext = createContext<SocialState>({
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
    const profile: Me = {
      uid: uidFor(backendId),
      backendId,
      displayName: user?.fullName,
      avatarUrl: user?.avatarUrl,
    };
    signInAsUser(backendId)
      .then(async () => {
        if (cancelled) return;
        await upsertUserMirror(profile).catch(() => {});
        setMe(profile);
      })
      .catch((e) => {
        console.warn('[social] Firebase sign-in failed', e);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.fullName, user?.avatarUrl]);

  // Live conversation list + a toast for messages arriving elsewhere.
  const lastSeen = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!me) return undefined;
    let first = true;
    return watchConversations(me.backendId, (list) => {
      setConversations(list);
      list.forEach((c) => {
        const at = c.lastMessageAt?.getTime() ?? 0;
        const before = lastSeen.current[c.id];
        lastSeen.current[c.id] = at;
        if (first || before === undefined || at <= before) return;
        if (c.lastMessageBy === me.uid || c.id === activeRef.current) return;
        notification.info({
          message: conversationTitle(c, me.backendId),
          description: c.lastMessage,
          placement: 'bottomRight',
          duration: 4,
        });
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

  const value = useMemo(
    () => ({
      me,
      conversations,
      unreadTotal,
      activeConversationId,
      setActiveConversationId,
    }),
    [me, conversations, unreadTotal, activeConversationId],
  );

  return (
    <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
  );
}
