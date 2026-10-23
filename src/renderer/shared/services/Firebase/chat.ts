import {
  Timestamp,
  arrayUnion,
  collection,
  deleteField,
  doc,
  getDoc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { firestore, uidFor } from './app';

// Firestore chat, wire-compatible with the mobile app
// (vision/lib/domain/entities/chat/fb_conversation.dart, fb_message.dart).

export type MessageType = 'text' | 'image' | 'file' | 'call';
export type CallOutcome = 'completed' | 'missed' | 'rejected' | 'cancelled';

export interface MemberProfile {
  uid?: string;
  backendId?: number;
  displayName?: string;
  avatarUrl?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  members: string[];
  memberBackendIds: number[];
  memberProfiles: Record<string, MemberProfile>;
  groupName?: string;
  groupAvatar?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageBy?: string;
  unreadCounts: Record<string, number>;
  lastReadAt: Record<string, Date>;
}

/** What a reply quotes (a snapshot: later edits/recalls don't change it). */
export interface ReplyRef {
  id: string;
  senderName?: string;
  type: MessageType;
  text?: string;
}

export interface Message {
  id: string;
  senderId: string;
  senderBackendId?: number;
  senderName?: string;
  senderAvatar?: string;
  type: MessageType;
  text?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  attachmentSize?: number;
  attachmentMime?: string;
  replyTo?: ReplyRef;
  /** Sent through "Chuyển tiếp". */
  forwarded?: boolean;
  /** Taken back by the sender: content removed for everyone. */
  recalled?: boolean;
  /** Backend ids who removed it from their own view ("Gỡ phía bạn"). */
  hiddenFor?: number[];
  callKind?: 'audio' | 'video';
  callOutcome?: CallOutcome;
  callDurationSec?: number;
  createdAt?: Date;
  clientTimetoken: number;
}

export interface Me {
  uid: string;
  backendId: number;
  displayName?: string;
  avatarUrl?: string;
}

const toDate = (value: unknown) =>
  value instanceof Timestamp ? value.toDate() : undefined;

const toConversation = (id: string, data: any): Conversation => ({
  id,
  type: data.type === 'group' ? 'group' : 'direct',
  members: data.members ?? [],
  memberBackendIds: (data.memberBackendIds ?? []).map(Number),
  memberProfiles: data.memberProfiles ?? {},
  groupName: data.groupName,
  groupAvatar: data.groupAvatar,
  lastMessage: data.lastMessage,
  lastMessageAt: toDate(data.lastMessageAt),
  lastMessageBy: data.lastMessageBy,
  unreadCounts: data.unreadCounts ?? {},
  lastReadAt: Object.fromEntries(
    Object.entries(data.lastReadAt ?? {}).map(([k, v]) => [k, toDate(v)!]),
  ),
});

const toMessage = (id: string, data: any): Message => ({
  id,
  senderId: data.senderId ?? '',
  senderBackendId: data.senderBackendId,
  senderName: data.senderName,
  senderAvatar: data.senderAvatar,
  type: (['image', 'file', 'call'].includes(data.type)
    ? data.type
    : 'text') as MessageType,
  text: data.text,
  attachmentUrl: data.attachmentUrl,
  attachmentName: data.attachmentName,
  attachmentSize: data.attachmentSize,
  attachmentMime: data.attachmentMime,
  replyTo: data.replyTo,
  forwarded: data.forwarded === true,
  recalled: data.recalled === true,
  hiddenFor: (data.hiddenFor ?? []).map(Number),
  callKind: data.callKind,
  callOutcome: data.callOutcome,
  callDurationSec: data.callDurationSec,
  createdAt: toDate(data.createdAt),
  clientTimetoken: data.clientTimetoken ?? 0,
});

/** The other person's backend id in a direct conversation. */
export const peerBackendId = (c: Conversation, me: number) =>
  c.memberBackendIds.find((id) => id !== me);

/**
 * Display profile of [backendId] in [c]. Profiles are keyed by Firebase
 * uid (possibly an old anonymous one) or `backend_<id>` placeholders.
 */
export function profileOf(c: Conversation, backendId?: number): MemberProfile {
  if (backendId === undefined) return {};
  const stable = c.memberProfiles[uidFor(backendId)];
  if (stable) return stable;
  const byId = Object.values(c.memberProfiles).find(
    (p) => Number(p.backendId) === backendId,
  );
  return byId ?? c.memberProfiles[`backend_${backendId}`] ?? {};
}

export const conversationTitle = (c: Conversation, me: number) =>
  c.type === 'group'
    ? (c.groupName ?? 'Nhóm')
    : (profileOf(c, peerBackendId(c, me)).displayName ?? 'Trò chuyện');

/** Whether [m] was sent by me (older messages may carry an old uid). */
export const isMine = (m: Message, me: Me) =>
  m.senderId === me.uid || m.senderBackendId === me.backendId;

export const directId = (a: number, b: number) => {
  const [x, y] = [a, b].sort((p, q) => p - q);
  return `direct_${x}_${y}`;
};

export function watchConversations(
  me: number,
  onChange: (list: Conversation[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(
    collection(firestore, 'conversations'),
    where('memberBackendIds', 'array-contains', me),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => toConversation(d.id, d.data()));
      list.sort(
        (a, b) =>
          (b.lastMessageAt?.getTime() ?? 0) - (a.lastMessageAt?.getTime() ?? 0),
      );
      onChange(list);
    },
    onError,
  );
}

export function watchMessages(
  conversationId: string,
  onChange: (list: Message[]) => void,
  max = 50,
) {
  const q = query(
    collection(firestore, 'conversations', conversationId, 'messages'),
    orderBy('clientTimetoken', 'desc'),
    limit(max),
  );
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => toMessage(d.id, d.data())).reverse());
  });
}

const preview = (m: Omit<Message, 'id'>) => {
  switch (m.type) {
    case 'image':
      return '[Hình ảnh]';
    case 'file':
      return '[Tệp đính kèm]';
    case 'call': {
      const kind = m.callKind === 'video' ? 'video' : 'thoại';
      if (m.callOutcome === 'missed') return `📵 Cuộc gọi ${kind} nhỡ`;
      if (m.callOutcome === 'rejected') return `📞 Cuộc gọi ${kind} bị từ chối`;
      if (m.callOutcome === 'completed') return `📞 Cuộc gọi ${kind}`;
      return `📞 Cuộc gọi ${kind} đã huỷ`;
    }
    default:
      return m.text ?? '';
  }
};

/** Writes a message and bumps the conversation preview + unread counts. */
export async function sendMessage(
  conversationId: string,
  me: Me,
  otherBackendIds: number[],
  content: Pick<
    Message,
    'type' | 'text' | 'attachmentUrl' | 'attachmentName' | 'callKind'
  > &
    Partial<
      Pick<
        Message,
        | 'callOutcome'
        | 'callDurationSec'
        | 'attachmentSize'
        | 'attachmentMime'
        | 'replyTo'
        | 'forwarded'
      >
    >,
) {
  const clientTimetoken = Date.now();
  const message: Omit<Message, 'id'> = {
    senderId: me.uid,
    senderBackendId: me.backendId,
    senderName: me.displayName,
    senderAvatar: me.avatarUrl,
    clientTimetoken,
    ...content,
  };
  const ref = doc(
    collection(firestore, 'conversations', conversationId, 'messages'),
  );
  const batch = writeBatch(firestore);
  batch.set(ref, {
    // JSON round-trip drops undefined fields, nested ones (replyTo) included:
    // Firestore rejects undefined values.
    ...JSON.parse(JSON.stringify(message)),
    createdAt: serverTimestamp(),
    readBy: [],
    deliveredTo: [],
  });
  batch.set(
    doc(firestore, 'conversations', conversationId),
    {
      lastMessage: preview(message),
      lastMessageAt: serverTimestamp(),
      lastMessageBy: me.uid,
      lastMessageType: message.type,
      unreadCounts: Object.fromEntries(
        otherBackendIds.map((id) => [String(id), increment(1)]),
      ),
    },
    { merge: true },
  );
  await batch.commit();
}

export function markRead(conversationId: string, me: Me) {
  return setDoc(
    doc(firestore, 'conversations', conversationId),
    {
      unreadCounts: { [String(me.backendId)]: 0 },
      lastReadAt: { [me.uid]: serverTimestamp() },
    },
    { merge: true },
  );
}

/** Opens (creating if needed) the 1:1 conversation with [peer]. */
export async function ensureDirectConversation(
  me: Me,
  peer: { backendId: number; displayName?: string; avatarUrl?: string },
) {
  const id = directId(me.backendId, peer.backendId);
  const ref = doc(firestore, 'conversations', id);
  const myProfile = {
    uid: me.uid,
    backendId: me.backendId,
    displayName: me.displayName ?? null,
    avatarUrl: me.avatarUrl ?? null,
  };
  const memberBackendIds = [me.backendId, peer.backendId].sort((a, b) => a - b);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    await setDoc(
      ref,
      {
        members: Array.from(new Set([...(data.members ?? []), me.uid])),
        memberBackendIds,
        memberProfiles: { [me.uid]: myProfile },
      },
      { merge: true },
    );
  } else {
    await setDoc(ref, {
      type: 'direct',
      members: [me.uid],
      memberBackendIds,
      createdBy: me.uid,
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
      unreadCounts: {
        [String(me.backendId)]: 0,
        [String(peer.backendId)]: 0,
      },
      memberProfiles: {
        [me.uid]: myProfile,
        [`backend_${peer.backendId}`]: {
          backendId: peer.backendId,
          displayName: peer.displayName ?? null,
          avatarUrl: peer.avatarUrl ?? null,
        },
      },
    });
  }
  return id;
}

/** Keeps `users/<uid>` (name, avatar) current for other clients. */
export function upsertUserMirror(me: Me) {
  return setDoc(
    doc(firestore, 'users', me.uid),
    {
      backendId: me.backendId,
      displayName: me.displayName ?? null,
      avatarUrl: me.avatarUrl ?? null,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/** Whether [backendId] has ever signed in with the stable uid. */
export async function hasStableUid(backendId: number) {
  const snap = await getDoc(doc(firestore, 'users', uidFor(backendId)));
  return snap.exists();
}

export const RECALLED_TEXT = 'Tin nhắn đã được thu hồi';

/**
 * The sender takes a message back for everyone: its content is removed and
 * clients show "Tin nhắn đã được thu hồi". [isNewest]: also fix the preview.
 */
export async function recallMessage(
  conversationId: string,
  messageId: string,
  isNewest: boolean,
) {
  await updateDoc(
    doc(firestore, 'conversations', conversationId, 'messages', messageId),
    {
      recalled: true,
      // Older apps don't know `recalled`: they show this text instead of an
      // empty bubble (or the picture/file).
      type: 'text',
      text: RECALLED_TEXT,
      attachmentUrl: deleteField(),
      attachmentName: deleteField(),
      attachmentSize: deleteField(),
      attachmentMime: deleteField(),
      replyTo: deleteField(),
    },
  );
  if (isNewest) {
    await setDoc(
      doc(firestore, 'conversations', conversationId),
      { lastMessage: RECALLED_TEXT },
      { merge: true },
    );
  }
}

/** "Gỡ tin nhắn phía bạn": hidden for me only. */
export function hideMessageForMe(
  conversationId: string,
  messageId: string,
  me: Me,
) {
  return updateDoc(
    doc(firestore, 'conversations', conversationId, 'messages', messageId),
    { hiddenFor: arrayUnion(me.backendId) },
  );
}

/**
 * New group conversation owned by [me] (same document as mobile's
 * `createGroup`, vision/lib/data/providers/firebase_chat.impl.dart).
 */
export async function createGroupConversation(
  me: Me,
  name: string,
  members: { backendId: number; displayName?: string; avatarUrl?: string }[],
) {
  const allBackendIds = Array.from(
    new Set([me.backendId, ...members.map((m) => m.backendId)]),
  ).sort((a, b) => a - b);
  const id = `group_${crypto.randomUUID()}`;
  await setDoc(doc(firestore, 'conversations', id), {
    type: 'group',
    members: [me.uid],
    memberBackendIds: allBackendIds,
    groupName: name,
    createdBy: me.uid,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp(),
    unreadCounts: Object.fromEntries(
      allBackendIds.map((bid) => [String(bid), 0]),
    ),
    memberProfiles: {
      [me.uid]: {
        uid: me.uid,
        backendId: me.backendId,
        displayName: me.displayName ?? null,
        avatarUrl: me.avatarUrl ?? null,
      },
      ...Object.fromEntries(
        members.map((m) => [
          `backend_${m.backendId}`,
          {
            backendId: m.backendId,
            displayName: m.displayName ?? null,
            avatarUrl: m.avatarUrl ?? null,
          },
        ]),
      ),
    },
  });
  return id;
}
