import Icon from '@/assets/svg/icons';
import { type Message, RECALLED_TEXT } from '@/shared/services/Firebase/chat';
import { Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { memo } from 'react';
import {
  bubbleTime,
  fileSize,
  linkify,
  messageDate,
  messageSummary,
} from '../chatFormat';

export type MessageAction = 'reply' | 'forward' | 'copy' | 'hide' | 'recall';

interface Props {
  message: Message;
  mine: boolean;
  /** Show the sender's name above (group chats, first of a run). */
  senderName?: string;
  onAction: (action: MessageAction, message: Message) => void;
  onCallBack?: (kind: 'audio' | 'video') => void;
  /** A picture finished loading (the thread grew taller). */
  onMediaLoad?: () => void;
}

const callText = (m: Message) => {
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
        title: 'Cuộc gọi đã hủy',
        sub: 'Nhấn để gọi lại',
        missed: false,
      };
  }
};

function Text({ text }: { text: string }) {
  return (
    <span className="chat-bubble-text">
      {linkify(text).map((part, i) =>
        part.href ? (
          // eslint-disable-next-line react/no-array-index-key
          <a key={i} href={part.href} target="_blank" rel="noreferrer">
            {part.text}
          </a>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message: m,
  mine,
  senderName,
  onAction,
  onCallBack,
  onMediaLoad,
}: Props) {
  const time = bubbleTime(messageDate(m));

  if (m.recalled) {
    return (
      <div className={`chat-bubble recalled ${mine ? 'mine' : ''}`}>
        <span className="chat-bubble-text">{RECALLED_TEXT}</span>
        <span className="chat-bubble-time">{time}</span>
      </div>
    );
  }

  let content;
  if (m.type === 'call') {
    const c = callText(m);
    content = (
      <button
        type="button"
        className={`chat-call ${c.missed ? 'missed' : ''}`}
        // One click used to start the call (a video one turns the camera
        // on): ask first.
        onClick={() => {
          if (!onCallBack) return;
          const video = m.callKind === 'video';
          Modal.confirm({
            title: video ? 'Gọi video lại?' : 'Gọi lại?',
            okText: 'Gọi',
            cancelText: 'Hủy',
            centered: true,
            onOk: () => onCallBack(video ? 'video' : 'audio'),
          });
        }}
      >
        <Icon name={m.callKind === 'video' ? 'chatVideo' : 'chatPhone'} />
        <span>
          <b>{c.title}</b>
          <small>{c.sub}</small>
        </span>
      </button>
    );
  } else if (m.type === 'image' && m.attachmentUrl) {
    content = (
      <a
        className="chat-bubble-image"
        href={m.attachmentUrl}
        target="_blank"
        rel="noreferrer"
      >
        <img
          src={m.attachmentUrl}
          alt={m.attachmentName ?? 'Hình ảnh'}
          onLoad={onMediaLoad}
        />
      </a>
    );
  } else if (m.type === 'file' && m.attachmentUrl) {
    const isPdf =
      m.attachmentMime === 'application/pdf' ||
      /\.pdf$/i.test(m.attachmentName ?? '');
    content = (
      <a
        className="chat-bubble-file"
        href={m.attachmentUrl}
        target="_blank"
        rel="noreferrer"
      >
        <span className="chat-bubble-file-icon">
          <Icon name={isPdf ? 'chatPdf' : 'chatPaperclip'} />
        </span>
        <span className="chat-bubble-file-text">
          <span>{m.attachmentName ?? 'Tệp đính kèm'}</span>
          {m.attachmentSize ? (
            <small>{fileSize(m.attachmentSize)}</small>
          ) : null}
        </span>
      </a>
    );
  } else {
    content = <Text text={m.text ?? ''} />;
  }

  const items: MenuProps['items'] = [
    { key: 'reply', label: 'Trả lời' },
    ...(m.type !== 'call' ? [{ key: 'forward', label: 'Chuyển tiếp' }] : []),
    ...(m.type === 'text' ? [{ key: 'copy', label: 'Sao chép tin nhắn' }] : []),
    { type: 'divider' as const },
    { key: 'hide', label: 'Gỡ tin nhắn phía bạn' },
    ...(mine && m.createdAt
      ? [{ key: 'recall', label: 'Thu hồi tin nhắn' }]
      : []),
  ];

  return (
    <div className={`chat-bubble-wrap ${mine ? 'mine' : ''}`}>
      <div className={`chat-bubble ${mine ? 'mine' : ''} ${m.type}`}>
        {senderName && <span className="chat-bubble-sender">{senderName}</span>}
        {m.forwarded && (
          <span className="chat-bubble-forwarded">Đã chuyển tiếp</span>
        )}
        {m.replyTo && (
          <span className="chat-bubble-quote">
            <b>{m.replyTo.senderName}</b>
            <span>{messageSummary(m.replyTo)}</span>
          </span>
        )}
        {content}
        <span className="chat-bubble-time">{time}</span>
      </div>
      <Dropdown
        trigger={['click']}
        placement={mine ? 'bottomRight' : 'bottomLeft'}
        overlayClassName="chat-message-menu"
        menu={{
          items,
          onClick: ({ key }) => onAction(key as MessageAction, m),
        }}
      >
        <button
          type="button"
          className="chat-bubble-more"
          aria-label="Tác vụ tin nhắn"
        >
          <Icon name="meetingDots" />
        </button>
      </Dropdown>
    </div>
  );
});
