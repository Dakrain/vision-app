import { Avatar } from '@/shared/components';
import Icon from '@/assets/svg/icons';
import { useCall } from '@/shared/social/CallProvider';
import { useSocial } from '@/shared/social/SocialProvider';
import {
  type Conversation,
  type Message,
  conversationTitle,
  hideMessageForMe,
  isMine,
  markRead,
  peerBackendId,
  profileOf,
  recallMessage,
  sendMessage,
  watchMessages,
} from '@/shared/services/Firebase/chat';
import { message as toast } from 'antd';
import {
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  dayDivider,
  isSameDay,
  messageDate,
  messageSummary,
} from '../chatFormat';
import { uploadAttachment } from '../chatUpload';
import { useOnline } from '../hooks';
import { ChatAvatar } from './ChatAvatar';
import { Composer } from './Composer';
import { MessageBubble, type MessageAction } from './MessageBubble';

const { clipboard } = window.require('electron');

type SendContent = Parameters<typeof sendMessage>[3];

/** A message that didn't go out (offline or error), kept until resent. */
interface FailedMessage {
  localId: string;
  preview: Message;
  retry: () => Promise<void>;
}

const PAGE = 50;

/** Small dark confirmation toast ("Đã sao chép"…). */
const confirm = (text: string) =>
  toast.open({ content: text, className: 'chat-toast', duration: 2 });

interface Props {
  conversation: Conversation;
  onForward: (message: Message) => void;
}

export function Thread({ conversation, onForward }: Props) {
  const { me } = useSocial();
  const call = useCall();
  const online = useOnline();
  const [messages, setMessages] = useState<Message[]>([]);
  const [max, setMax] = useState(PAGE);
  const [failed, setFailed] = useState<FailedMessage[]>([]);
  const [replyTo, setReplyTo] = useState<Message>();
  const [atBottom, setAtBottom] = useState(true);
  const [unseen, setUnseen] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(
    () => watchMessages(conversation.id, setMessages, max),
    [conversation.id, max],
  );

  const visible = useMemo(
    () =>
      me
        ? messages.filter((m) => !m.hiddenFor?.includes(me.backendId))
        : messages,
    [messages, me],
  );

  // Seeing the messages = read.
  useEffect(() => {
    if (!me || !atBottom) return;
    if ((conversation.unreadCounts[String(me.backendId)] ?? 0) > 0) {
      markRead(conversation.id, me).catch(() => {});
    }
  }, [conversation, messages, me, atBottom]);

  const scrollToBottom = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(0);
  }, []);

  // A newer message at the bottom: follow it when at the bottom, else count
  // it. Older pages loading at the top keep the reader's place. Runs before
  // paint (rAF stalls while the window is hidden).
  const newestId = visible[visible.length - 1]?.id;
  const lastNewest = useRef<string>();
  const olderFrom = useRef<{ height: number; top: number }>();
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (el && olderFrom.current) {
      el.scrollTop =
        el.scrollHeight - olderFrom.current.height + olderFrom.current.top;
      olderFrom.current = undefined;
    }
    if (!newestId || newestId === lastNewest.current) return;
    const first = lastNewest.current === undefined;
    lastNewest.current = newestId;
    if (first || atBottom) scrollToBottom();
    else setUnseen((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useLayoutEffect(() => {
    if (atBottom) scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failed.length]);

  const onScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAtBottom(bottom);
    if (bottom) setUnseen(0);
    // Older messages when reaching the top.
    if (el.scrollTop < 40 && messages.length >= max && !olderFrom.current) {
      olderFrom.current = { height: el.scrollHeight, top: el.scrollTop };
      setMax((m) => m + PAGE);
    }
  };

  if (!me) return null;

  const peer =
    conversation.type === 'direct'
      ? peerBackendId(conversation, me.backendId)
      : undefined;
  const peerProfile = profileOf(conversation, peer);
  const title = conversationTitle(conversation, me.backendId);
  const others = conversation.memberBackendIds.filter(
    (id) => id !== me.backendId,
  );
  const nameOf = (m: Message) =>
    isMine(m, me)
      ? 'bạn'
      : (m.senderName ??
        profileOf(conversation, m.senderBackendId).displayName ??
        title);

  const deliver = async (content: SendContent, preview: Message) => {
    const localId = preview.id;
    const attempt = async () => {
      if (!navigator.onLine) throw new Error('offline');
      await sendMessage(conversation.id, me, others, content);
    };
    try {
      await attempt();
    } catch (_) {
      const entry: FailedMessage = {
        localId,
        preview,
        retry: async () => {
          setFailed((list) => list.filter((f) => f.localId !== localId));
          try {
            await attempt();
          } catch (__) {
            setFailed((list) => [...list, entry]);
          }
        },
      };
      setFailed((list) => [...list, entry]);
    }
  };

  const previewOf = (content: SendContent): Message => ({
    id: `local-${Date.now()}-${Math.random()}`,
    senderId: me.uid,
    senderBackendId: me.backendId,
    clientTimetoken: Date.now(),
    ...content,
  });

  const replyRef = () =>
    replyTo
      ? {
          id: replyTo.id,
          senderName:
            nameOf(replyTo) === 'bạn' ? me.displayName : nameOf(replyTo),
          type: replyTo.type,
          text: messageSummary(replyTo),
        }
      : undefined;

  const sendText = (text: string) => {
    const content: SendContent = { type: 'text', text, replyTo: replyRef() };
    setReplyTo(undefined);
    setAtBottom(true);
    deliver(content, previewOf(content));
  };

  const sendFile = async (file: File, kind: 'image' | 'file') => {
    const base = {
      type: kind,
      attachmentName: file.name,
      attachmentSize: file.size,
      attachmentMime: file.type || undefined,
      replyTo: replyRef(),
    } as const;
    setReplyTo(undefined);
    const preview = previewOf({ ...base });
    const localId = preview.id;
    const attempt = async () => {
      if (!navigator.onLine) throw new Error('offline');
      const attachmentUrl = await uploadAttachment(file);
      await sendMessage(conversation.id, me, others, {
        ...base,
        attachmentUrl,
      });
    };
    const fail = () => {
      const entry: FailedMessage = {
        localId,
        preview,
        retry: async () => {
          setFailed((list) => list.filter((f) => f.localId !== localId));
          try {
            await attempt();
          } catch (_) {
            setFailed((list) => [...list, entry]);
          }
        },
      };
      setFailed((list) => [...list, entry]);
    };
    const hide = toast.loading({ content: 'Đang gửi tệp…', key: localId });
    try {
      await attempt();
    } catch (_) {
      fail();
    } finally {
      hide();
    }
  };

  const onAction = async (action: MessageAction, m: Message) => {
    try {
      switch (action) {
        case 'reply':
          setReplyTo(m);
          break;
        case 'forward':
          onForward(m);
          break;
        case 'copy':
          clipboard.writeText(m.text ?? '');
          confirm('Đã sao chép');
          break;
        case 'hide':
          await hideMessageForMe(conversation.id, m.id, me);
          confirm('Đã gỡ tin nhắn phía bạn');
          break;
        case 'recall':
          await recallMessage(
            conversation.id,
            m.id,
            visible[visible.length - 1]?.id === m.id,
          );
          confirm('Đã thu hồi tin nhắn');
          break;
        default:
      }
    } catch (_) {
      toast.error('Không thực hiện được, vui lòng thử lại');
    }
  };

  const startCall = (type: 'audio' | 'video') =>
    peer &&
    call.startCall(
      {
        backendId: peer,
        name: peerProfile.displayName,
        avatar: peerProfile.avatarUrl,
      },
      type,
    );

  // Read state of my newest message (direct chats).
  // Latest read marker of anyone else: the peer, or any group member.
  const isOtherUid = (uid: string) => {
    const backendId = Number(
      conversation.memberProfiles[uid]?.backendId ?? uid.replace(/^u/, ''),
    );
    return peer !== undefined
      ? uid === `u${peer}` || backendId === peer
      : uid !== me.uid && backendId !== me.backendId;
  };
  const peerRead = Object.entries(conversation.lastReadAt)
    .filter(([uid]) => isOtherUid(uid))
    .map(([, at]) => at)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  const lastMine = [...visible].reverse().find((m) => isMine(m, me));

  const myProfile = { avatarUrl: me.avatarUrl, displayName: me.displayName };

  return (
    <div className="chat-thread">
      <div className="chat-thread-header">
        <ChatAvatar conversation={conversation} me={me.backendId} size={40} />
        <div className="chat-thread-title">
          <b>{title}</b>
          {conversation.type === 'group' && (
            <small>{conversation.memberBackendIds.length} thành viên</small>
          )}
        </div>
        {peer && (
          <div className="chat-thread-actions">
            <button
              type="button"
              title="Gọi thoại"
              onClick={() => startCall('audio')}
            >
              <Icon name="chatPhone" />
            </button>
            <button
              type="button"
              title="Gọi video"
              onClick={() => startCall('video')}
            >
              <Icon name="chatVideo" />
            </button>
          </div>
        )}
      </div>
      {!online && (
        <div className="chat-offline" role="status">
          Không có kết nối internet
        </div>
      )}

      <div className="chat-thread-main">
        <div className="chat-thread-body" ref={bodyRef} onScroll={onScroll}>
          {visible.map((m, i) => {
            const prev = visible[i - 1];
            const mine = isMine(m, me);
            const date = messageDate(m);
            const newDay = !prev || !isSameDay(messageDate(prev), date);
            const firstOfRun =
              newDay ||
              !prev ||
              prev.senderBackendId !== m.senderBackendId ||
              prev.type === 'call' ||
              m.type === 'call';
            const sender = mine
              ? myProfile
              : {
                  avatarUrl:
                    m.senderAvatar ??
                    profileOf(conversation, m.senderBackendId).avatarUrl,
                  displayName: nameOf(m),
                };
            let status: string | undefined;
            if (m === lastMine) {
              if (!m.createdAt) status = 'sending';
              else if (peerRead && peerRead >= m.createdAt) status = 'seen';
              else status = 'sent';
            }
            return (
              <Fragment key={m.id}>
                {newDay && <div className="chat-day">{dayDivider(date)}</div>}
                <div
                  className={`chat-row ${mine ? 'mine' : ''} ${firstOfRun ? 'first' : ''}`}
                >
                  <span className="chat-row-avatar">
                    {firstOfRun && (
                      <Avatar
                        url={sender.avatarUrl ?? ''}
                        radius={14}
                        name={sender.displayName ?? '?'}
                      />
                    )}
                  </span>
                  <div className="chat-row-content">
                    <MessageBubble
                      message={m}
                      mine={mine}
                      senderName={
                        conversation.type === 'group' && !mine && firstOfRun
                          ? sender.displayName
                          : undefined
                      }
                      onAction={onAction}
                      onCallBack={startCall}
                      onMediaLoad={() => atBottom && scrollToBottom()}
                    />
                    {status && (
                      <span
                        className={`chat-ticks ${status}`}
                        title={
                          {
                            sending: 'Đang gửi',
                            sent: 'Đã gửi',
                            seen: 'Đã xem',
                          }[status]
                        }
                      >
                        {status !== 'sending' && (
                          <>
                            <Icon name="chatCheck" />
                            <Icon name="chatCheck" />
                          </>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
          {failed.map((f) => (
            <div key={f.localId} className="chat-row mine failed">
              <span className="chat-row-avatar" />
              <div className="chat-row-content">
                <div className="chat-failed">
                  <button
                    type="button"
                    className="chat-retry"
                    onClick={f.retry}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                      <path
                        d="M20 12a8 8 0 1 1-2.34-5.66M20 4v4.5h-4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Gửi lại
                  </button>
                  <MessageBubble message={f.preview} mine onAction={() => {}} />
                  <span className="chat-failed-mark" aria-hidden>
                    !
                  </span>
                </div>
                <span className="chat-failed-text">Không thể gửi tin nhắn</span>
              </div>
            </div>
          ))}
        </div>
        {!atBottom && (
          <button
            type="button"
            className="chat-jump"
            aria-label="Xem tin nhắn mới nhất"
            onClick={scrollToBottom}
          >
            ↓{unseen > 0 && <span>{unseen > 99 ? '99+' : unseen}</span>}
          </button>
        )}
      </div>

      <Composer
        replyTo={
          replyTo
            ? { message: replyTo, senderName: nameOf(replyTo) }
            : undefined
        }
        onCancelReply={() => setReplyTo(undefined)}
        onSendText={sendText}
        onSendFile={sendFile}
      />
    </div>
  );
}
