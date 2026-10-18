import { Avatar } from '@/renderer/shared/components';
import { useCall } from '@/renderer/shared/social/CallProvider';
import { useSocial } from '@/renderer/shared/social/SocialProvider';
import {
  Conversation,
  Message,
  conversationTitle,
  ensureDirectConversation,
  isMine,
  markRead,
  peerBackendId,
  profileOf,
  sendMessage,
  watchMessages,
} from '@/renderer/shared/services/Firebase/chat';
import MeetingService from '@/shared/services/Meeting/MeetingService';
import { User } from '@/renderer/shared/types/user';
import {
  PaperClipOutlined,
  PhoneOutlined,
  SendOutlined,
  VideoCameraOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { Badge, Button, Empty, Input, List, Modal, notification } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import './Chat.scss';

const MEDIA_UPLOAD_URL = 'https://media.vision20.us/v1/upload';

const timeLabel = (d?: Date) => {
  if (!d) return '';
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const callLabel = (m: Message) => {
  const kind = m.callKind === 'video' ? 'video' : 'thoại';
  switch (m.callOutcome) {
    case 'completed': {
      const s = m.callDurationSec ?? 0;
      const len =
        s >= 60 ? `${Math.floor(s / 60)} phút ${s % 60} giây` : `${s} giây`;
      return { title: `Cuộc gọi ${kind}`, sub: len, missed: false };
    }
    case 'missed':
      return { title: 'Cuộc gọi nhỡ', sub: 'Nhấn để gọi lại', missed: true };
    case 'rejected':
      return {
        title: 'Cuộc gọi bị từ chối',
        sub: 'Nhấn để gọi lại',
        missed: true,
      };
    default:
      return {
        title: 'Cuộc gọi đã huỷ',
        sub: 'Nhấn để gọi lại',
        missed: false,
      };
  }
};

/** Uploads a picture to the media server (same endpoint as mobile). */
async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append('type', 'messenger');
  form.append('object_id', '0');
  form.append('file', file, file.name);
  const res = await fetch(MEDIA_UPLOAD_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localStorage.getItem('token')}`,
      appplatform: navigator.userAgent.includes('Mac') ? 'MacOs' : 'Windows',
    },
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  const url = body?.url ?? body?.data?.url;
  if (!res.ok || !url) throw new Error('upload failed');
  return url;
}

function NewChatDialog({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (user: User) => void;
}) {
  const [email, setEmail] = useState('');
  const [results, setResults] = useState<User[]>();
  const search = async () => {
    if (!email.trim()) return;
    try {
      const res = await MeetingService.findUsers(email.trim());
      setResults(res.rows ?? []);
    } catch (_) {
      setResults([]);
    }
  };
  return (
    <Modal
      open={open}
      title="Tin nhắn mới"
      footer={null}
      onCancel={() => {
        setEmail('');
        setResults(undefined);
        onClose();
      }}
    >
      <Input.Search
        placeholder="Nhập email người nhận"
        enterButton="Tìm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onSearch={search}
      />
      <List
        style={{ marginTop: 12 }}
        locale={{ emptyText: results ? 'Không tìm thấy người dùng' : ' ' }}
        dataSource={results ?? []}
        renderItem={(user) => (
          <List.Item
            className="chat-pick"
            onClick={() => {
              onPick(user);
              setEmail('');
              setResults(undefined);
            }}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  url={user.avatarUrl ?? ''}
                  radius={16}
                  name={user.fullName ?? '?'}
                />
              }
              title={user.fullName}
              description={user.email}
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}

function Thread({ conversation }: { conversation: Conversation }) {
  const { me } = useSocial();
  const call = useCall();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => watchMessages(conversation.id, setMessages),
    [conversation.id],
  );

  // Seeing the messages = read.
  useEffect(() => {
    if (!me) return;
    if ((conversation.unreadCounts[String(me.backendId)] ?? 0) > 0) {
      markRead(conversation.id, me).catch(() => {});
    }
  }, [conversation, messages, me]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

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

  const send = async (content: Parameters<typeof sendMessage>[3]) => {
    setSending(true);
    try {
      await sendMessage(conversation.id, me, others, content);
    } catch (_) {
      notification.error({ message: 'Không gửi được tin nhắn' });
    } finally {
      setSending(false);
    }
  };

  const sendText = async () => {
    const value = text.trim();
    if (!value) return;
    setText('');
    await send({ type: 'text', text: value });
  };

  const sendImage = async (file?: File) => {
    if (!file) return;
    try {
      setSending(true);
      const url = await uploadImage(file);
      await send({
        type: 'image',
        attachmentUrl: url,
        attachmentName: file.name,
      });
    } catch (_) {
      notification.error({ message: 'Không gửi được ảnh' });
    } finally {
      setSending(false);
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

  // "Đã xem" under my newest message once the peer read past it.
  const peerRead = peer
    ? Object.entries(conversation.lastReadAt)
        .filter(
          ([uid]) =>
            uid === `u${peer}` ||
            Number(conversation.memberProfiles[uid]?.backendId) === peer,
        )
        .map(([, at]) => at)
        .sort((a, b) => b.getTime() - a.getTime())[0]
    : undefined;
  const lastMine = [...messages].reverse().find((m) => isMine(m, me));

  return (
    <div className="chat-thread">
      <div className="chat-thread-header">
        <Avatar url={peerProfile.avatarUrl ?? ''} radius={18} name={title} />
        <span className="chat-thread-title">{title}</span>
        {peer && (
          <>
            <Button
              type="text"
              icon={<PhoneOutlined />}
              title="Gọi thoại"
              onClick={() => startCall('audio')}
            />
            <Button
              type="text"
              icon={<VideoCameraOutlined />}
              title="Gọi video"
              onClick={() => startCall('video')}
            />
          </>
        )}
      </div>

      <div className="chat-thread-body">
        {messages.map((m) => {
          const mine = isMine(m, me);
          let bubble;
          if (m.type === 'call') {
            const c = callLabel(m);
            bubble = (
              <button
                type="button"
                className={`chat-bubble call ${c.missed ? 'missed' : ''}`}
                onClick={() =>
                  startCall(m.callKind === 'video' ? 'video' : 'audio')
                }
              >
                <PhoneOutlined className="chat-call-icon" />
                <span className="chat-call-text">
                  <b>{c.title}</b>
                  <span>{c.sub}</span>
                </span>
              </button>
            );
          } else if (m.type === 'image' && m.attachmentUrl) {
            bubble = (
              <a
                className="chat-bubble image"
                href={m.attachmentUrl}
                target="_blank"
                rel="noreferrer"
              >
                <img
                  src={m.attachmentUrl}
                  alt={m.attachmentName ?? 'Hình ảnh'}
                />
              </a>
            );
          } else if (m.type === 'file' && m.attachmentUrl) {
            bubble = (
              <a
                className="chat-bubble"
                href={m.attachmentUrl}
                target="_blank"
                rel="noreferrer"
              >
                <PaperClipOutlined /> {m.attachmentName ?? 'Tệp đính kèm'}
              </a>
            );
          } else {
            bubble = <div className="chat-bubble">{m.text}</div>;
          }
          return (
            <div key={m.id} className={`chat-row ${mine ? 'mine' : ''}`}>
              {!mine && (
                <Avatar
                  url={m.senderAvatar ?? ''}
                  radius={14}
                  name={m.senderName ?? title}
                />
              )}
              <div className="chat-row-content">
                {bubble}
                <span className="chat-time">
                  {timeLabel(m.createdAt ?? new Date(m.clientTimetoken))}
                  {m === lastMine &&
                    (peerRead && m.createdAt && peerRead >= m.createdAt
                      ? ' · Đã xem'
                      : m.createdAt
                        ? ' · Đã gửi'
                        : ' · Đang gửi')}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            sendImage(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Button
          type="text"
          icon={<PaperClipOutlined />}
          title="Gửi ảnh"
          onClick={() => fileRef.current?.click()}
        />
        <Input
          placeholder="Nhập tin nhắn..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={sendText}
        />
        <Button
          type="primary"
          icon={<SendOutlined />}
          loading={sending}
          onClick={sendText}
        />
      </div>
    </div>
  );
}

function Chat() {
  const { me, conversations, activeConversationId, setActiveConversationId } =
    useSocial();
  const [newChatOpen, setNewChatOpen] = useState(false);

  // Leaving the Chat page: nothing is "on screen" any more.
  useEffect(
    () => () => setActiveConversationId(undefined),
    [setActiveConversationId],
  );

  const active = useMemo(
    () => conversations.find((c) => c.id === activeConversationId),
    [conversations, activeConversationId],
  );

  const openWith = async (user: User) => {
    if (!me || !user.id) return;
    setNewChatOpen(false);
    try {
      const id = await ensureDirectConversation(me, {
        backendId: user.id,
        displayName: user.fullName,
        avatarUrl: user.avatarUrl,
      });
      setActiveConversationId(id);
    } catch (_) {
      notification.error({ message: 'Không mở được cuộc trò chuyện' });
    }
  };

  if (!me) {
    return <div className="chat-loading">Đang kết nối trò chuyện…</div>;
  }

  return (
    <div className="chat-page">
      <div className="chat-list">
        <div className="chat-list-header">
          <span>Tin nhắn</span>
          <Button
            type="text"
            icon={<EditOutlined />}
            title="Tin nhắn mới"
            onClick={() => setNewChatOpen(true)}
          />
        </div>
        {conversations.length === 0 ? (
          <Empty description="Chưa có cuộc trò chuyện nào" />
        ) : (
          conversations.map((c) => {
            const title = conversationTitle(c, me.backendId);
            const profile = profileOf(c, peerBackendId(c, me.backendId));
            const unread = c.unreadCounts[String(me.backendId)] ?? 0;
            return (
              <button
                key={c.id}
                type="button"
                className={`chat-list-item ${c.id === activeConversationId ? 'active' : ''}`}
                onClick={() => setActiveConversationId(c.id)}
              >
                <Avatar
                  url={
                    (c.type === 'group' ? c.groupAvatar : profile.avatarUrl) ??
                    ''
                  }
                  radius={20}
                  name={title}
                />
                <div className="chat-list-item-text">
                  <div className="chat-list-item-top">
                    <b>{title}</b>
                    <span>{timeLabel(c.lastMessageAt)}</span>
                  </div>
                  <div className="chat-list-item-bottom">
                    <span>{c.lastMessage}</span>
                    <Badge count={unread} size="small" />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
      {active ? (
        <Thread key={active.id} conversation={active} />
      ) : (
        <div className="chat-placeholder">
          Chọn một cuộc trò chuyện hoặc bấm ✎ để nhắn tin mới
        </div>
      )}
      <NewChatDialog
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onPick={openWith}
      />
    </div>
  );
}

export default Chat;
