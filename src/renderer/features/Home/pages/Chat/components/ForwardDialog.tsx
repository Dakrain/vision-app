import Icon from '@/assets/svg/icons';
import { Avatar } from '@/shared/components';
import { useSocial } from '@/shared/social/SocialProvider';
import {
  type Message,
  ensureDirectConversation,
  sendMessage,
} from '@/shared/services/Firebase/chat';
import type { Contact } from '@/shared/services/Friend/FriendService';
import { Modal, message as toast } from 'antd';
import { useMemo, useState } from 'react';
import { matches } from '../hooks';

interface Props {
  message?: Message;
  /** People I can forward to: contacts plus people I already chat with. */
  people: Contact[];
  onClose: () => void;
}

/** "Chuyển tiếp đến": pick people, add an optional note, send. */
export function ForwardDialog({ message, people, onClose }: Props) {
  const { me } = useSocial();
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const shown = useMemo(
    () =>
      people.filter(
        (p) => matches(p.fullName, query) || matches(p.email, query),
      ),
    [people, query],
  );

  const reset = () => {
    setQuery('');
    setPicked([]);
    setNote('');
  };

  const toggle = (id: number) =>
    setPicked((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id],
    );

  const send = async () => {
    if (!me || !message || picked.length === 0) return;
    setSending(true);
    try {
      await Promise.all(
        picked.map(async (id) => {
          const person = people.find((p) => p.id === id);
          const cid = await ensureDirectConversation(me, {
            backendId: id,
            displayName: person?.fullName,
            avatarUrl: person?.avatarUrl,
          });
          await sendMessage(cid, me, [id], {
            type: message.type,
            text: message.text,
            attachmentUrl: message.attachmentUrl,
            attachmentName: message.attachmentName,
            attachmentSize: message.attachmentSize,
            attachmentMime: message.attachmentMime,
            forwarded: true,
          });
          if (note.trim()) {
            await sendMessage(cid, me, [id], {
              type: 'text',
              text: note.trim(),
            });
          }
        }),
      );
      toast.open({
        content: 'Đã chuyển tiếp',
        className: 'chat-toast',
        duration: 2,
      });
      onClose();
    } catch (_) {
      toast.error('Không chuyển tiếp được, vui lòng thử lại');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      open={!!message}
      onCancel={onClose}
      afterClose={reset}
      centered
      width={446}
      title={null}
      footer={null}
      closable={false}
      className="chat-forward"
    >
      <div className="chat-forward-header">
        <h2>Chuyển tiếp đến</h2>
        <button type="button" aria-label="Đóng" onClick={onClose}>
          <Icon name="meetingClose" />
        </button>
      </div>
      <label className="chat-search white" htmlFor="chat-forward-search">
        <Icon name="chatSearch" />
        <input
          id="chat-forward-search"
          placeholder="Tìm kiếm"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="chat-forward-label">DANH BẠ</div>
      <div className="chat-forward-list">
        {shown.map((p) => (
          <button
            key={p.id}
            type="button"
            className="chat-person"
            aria-pressed={picked.includes(p.id)}
            onClick={() => toggle(p.id)}
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
            <span
              className={`chat-radio ${picked.includes(p.id) ? 'on' : ''}`}
            />
          </button>
        ))}
        {shown.length === 0 && (
          <div className="chat-empty">Không tìm thấy liên hệ nào</div>
        )}
      </div>
      <div className="chat-forward-note">
        <input
          placeholder="Tin nhắn ..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) send();
          }}
        />
        <button
          type="button"
          aria-label="Gửi"
          disabled={picked.length === 0 || sending}
          onClick={send}
        >
          <Icon name="send" />
        </button>
      </div>
    </Modal>
  );
}
