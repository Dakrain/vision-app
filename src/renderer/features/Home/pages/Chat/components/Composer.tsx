import Icon from '@/assets/svg/icons';
import type { Message } from '@/shared/services/Firebase/chat';
import { Popover } from 'antd';
import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import { messageSummary } from '../chatFormat';

const EMOJIS = [
  '😀',
  '😂',
  '🥰',
  '😍',
  '😊',
  '😉',
  '😎',
  '🤔',
  '😢',
  '😭',
  '😡',
  '😮',
  '👍',
  '👎',
  '👏',
  '🙏',
  '💪',
  '🤝',
  '👋',
  '🙌',
  '❤️',
  '💔',
  '🔥',
  '🎉',
  '✅',
  '❌',
  '⭐',
  '🌹',
  '☕',
  '🎂',
  '📌',
  '📅',
  '📞',
  '💬',
  '✝️',
  '🕊️',
];

interface Props {
  disabled?: boolean;
  replyTo?: { message: Message; senderName: string };
  onCancelReply: () => void;
  onSendText: (text: string) => void;
  onSendFile: (file: File, kind: 'image' | 'file') => void;
}

/** Message box (Figma "Chatbox"): file, text, image, emoji, send. */
export function Composer({
  disabled,
  replyTo,
  onCancelReply,
  onSendText,
  onSendFile,
}: Props) {
  const [text, setText] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  // Grow with the text, up to about six lines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 144)}px`;
  }, [text]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  const send = () => {
    const value = text.trim();
    if (!value || disabled) return;
    onSendText(value);
    setText('');
  };

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const pick =
    (kind: 'image' | 'file') => (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (file) onSendFile(file, kind);
    };

  return (
    <div className="chat-composer">
      {replyTo && (
        <div className="chat-reply-bar">
          <div>
            <b>Đang trả lời {replyTo.senderName}</b>
            <span>{messageSummary(replyTo.message)}</span>
          </div>
          <button
            type="button"
            aria-label="Huỷ trả lời"
            onClick={onCancelReply}
          >
            <Icon name="meetingClose" />
          </button>
        </div>
      )}
      <div className="chat-composer-row">
        <input ref={fileRef} type="file" hidden onChange={pick('file')} />
        <input
          ref={imageRef}
          type="file"
          accept="image/*"
          hidden
          onChange={pick('image')}
        />
        <button
          type="button"
          className="chat-composer-attach"
          title="Gửi tệp"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          <Icon name="chatPaperclip" />
        </button>
        <div className="chat-composer-box">
          <textarea
            ref={inputRef}
            rows={1}
            placeholder="Nhắn tin ..."
            value={text}
            disabled={disabled}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                send();
              }
            }}
          />
          {!text.trim() && (
            <button
              type="button"
              className="chat-composer-icon"
              title="Gửi ảnh"
              disabled={disabled}
              onClick={() => imageRef.current?.click()}
            >
              <Icon name="chatImage" />
            </button>
          )}
          <Popover
            open={emojiOpen}
            onOpenChange={setEmojiOpen}
            trigger="click"
            placement="topRight"
            content={
              <div className="chat-emoji-grid">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            }
          >
            <button
              type="button"
              className="chat-composer-icon"
              title="Biểu tượng cảm xúc"
              disabled={disabled}
            >
              <Icon name="chatSmiley" />
            </button>
          </Popover>
          {text.trim() && (
            <button
              type="button"
              className="chat-composer-icon send"
              title="Gửi"
              onClick={send}
            >
              <Icon name="send" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
