import Icon from '@/assets/svg/icons';
import i18n from '@/renderer/i18n';
import type { Message } from '@/shared/services/Firebase/chat';
import { Dropdown, Modal } from 'antd';
import type { MenuProps } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  bubbleTime,
  fileSize,
  linkify,
  messageDate,
  messageSummaryText,
} from '../chatFormat';

export type MessageAction =
  | 'reply'
  | 'forward'
  | 'copy'
  | 'hide'
  | 'recall'
  | 'report';

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
  const callBack = i18n.t('call.trace.tap_to_call_back');
  switch (m.callOutcome) {
    case 'completed': {
      const s = m.callDurationSec ?? 0;
      const len =
        s >= 60
          ? i18n.t('call.trace.duration_min_sec', {
              min: Math.floor(s / 60),
              sec: s % 60,
            })
          : i18n.t('call.trace.duration_sec', { sec: s });
      const title =
        m.callKind === 'video'
          ? i18n.t('call.type.video')
          : i18n.t('call.type.voice');
      return { title, sub: len, missed: false };
    }
    case 'missed':
      return {
        title: i18n.t('call.trace.missed'),
        sub: callBack,
        missed: true,
      };
    case 'rejected':
      return {
        title: i18n.t('call.trace.rejected'),
        sub: callBack,
        missed: true,
      };
    default:
      return {
        title: i18n.t('call.trace.cancelled'),
        sub: callBack,
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
  // Re-renders this memoized bubble when the language changes.
  const { t } = useTranslation();
  const time = bubbleTime(messageDate(m));

  if (m.recalled) {
    return (
      <div className={`chat-bubble recalled ${mine ? 'mine' : ''}`}>
        <span className="chat-bubble-text">{t('chat.recalled')}</span>
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
            title: video
              ? t('call.trace.call_back_video_title')
              : t('call.trace.call_back_title'),
            okText: t('call.trace.call'),
            cancelText: t('common.cancel'),
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
          alt={m.attachmentName ?? t('chat.screen.image')}
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
          <span>{m.attachmentName ?? t('chat.screen.attachment')}</span>
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
    { key: 'reply', label: t('chat.actions.reply') },
    ...(m.type !== 'call'
      ? [{ key: 'forward', label: t('chat.actions.forward') }]
      : []),
    ...(m.type === 'text'
      ? [{ key: 'copy', label: t('chat.actions.copy') }]
      : []),
    { type: 'divider' as const },
    { key: 'hide', label: t('chat.actions.hide') },
    ...(mine && m.createdAt
      ? [{ key: 'recall', label: t('chat.actions.recall') }]
      : []),
    // Someone else's message can be reported (App Store 1.2).
    ...(!mine && m.type !== 'call' && !m.recalled
      ? [{ key: 'report', label: t('chat.actions.report'), danger: true }]
      : []),
  ];

  return (
    <div className={`chat-bubble-wrap ${mine ? 'mine' : ''}`}>
      <div className={`chat-bubble ${mine ? 'mine' : ''} ${m.type}`}>
        {senderName && <span className="chat-bubble-sender">{senderName}</span>}
        {m.forwarded && (
          <span className="chat-bubble-forwarded">
            {t('chat.forward.forwarded')}
          </span>
        )}
        {m.replyTo && (
          <span className="chat-bubble-quote">
            <b>{m.replyTo.senderName}</b>
            <span>{messageSummaryText(m.replyTo)}</span>
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
          aria-label={t('chat.actions.menu')}
        >
          <Icon name="meetingDots" />
        </button>
      </Dropdown>
    </div>
  );
});
