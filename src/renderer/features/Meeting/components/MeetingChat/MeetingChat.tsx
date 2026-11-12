import Icon from '@/assets/svg/icons';
import { ChatBubble } from '@/renderer/shared/components';
import { useAppDispatch } from '@/renderer/store';
import { useAuth } from '@/shared/hooks';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { sendChat } from '../../store/action';
import { PanelHeader } from '../PanelHeader';
import { selectChats } from '../../store/selector';
import './MeetingChat.scss';
import { MeetingChatProps } from './types';

export function MeetingChat({
  sendMessage,
  canSend = true,
  online = true,
  onClose,
}: MeetingChatProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { meetingId } = useLocation().state;
  const chats = useSelector(selectChats);
  const [message, setMessage] = useState('');
  const sendChatMessage = () => {
    if (!message.trim() || !canSend) return;

    setMessage('');
    dispatch(
      sendChat({
        meetingId,
        request: { message, type: 'text' },
        user: user || {},
        callback: (newMessage) => {
          sendMessage(newMessage);
        },
      }),
    );
  };

  // Keep the newest message in view.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [chats.length]);

  return (
    <div className="meeting-chat">
      <PanelHeader title={t('meeting.chat.title')} onClose={onClose} />
      {!online && (
        <div className="meeting-chat-offline" role="status">
          <span className="meeting-chat-offline-spinner" />
          {t('meeting.chat.reconnecting')}
        </div>
      )}
      <div className="meeting-chat-body">
        <div className="meeting-chat-notice">
          {t('meeting.chat.visibility_note')}
        </div>
        <div className="meeting-chat-messages">
          {chats.map((chat, index) => (
            <ChatBubble
              key={chat.id}
              message={chat}
              showSender={
                index === 0 || chats[index - 1].userId !== chat.userId
              }
              isMe={chat.userId === user?.id}
            />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>
      <div className="meeting-chat-input">
        <input
          placeholder={
            canSend
              ? t('meeting.chat.input_hint')
              : t('meeting.chat.disabled_short')
          }
          disabled={!canSend}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              sendChatMessage();
            }
          }}
        />
        <button
          type="button"
          className="meeting-chat-send"
          disabled={!canSend || !message.trim()}
          onClick={() => sendChatMessage()}
          aria-label={t('meeting.chat.send')}
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}
