import Icon from '@/assets/svg/icons';
import { ChatBubble } from '@/renderer/shared/components';
import { useAppDispatch } from '@/renderer/store';
import { useAuth } from '@/shared/hooks';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { sendChat } from '../../store/action';
import { selectChats } from '../../store/selector';
import './MeetingChat.scss';
import { MeetingChatProps } from './types';

export function MeetingChat({
  sendMessage,
  canSend = true,
  online = true,
}: MeetingChatProps) {
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
      <div className="meeting-chat-header">Tin nhắn trong cuộc họp</div>
      {!online && (
        <div className="meeting-chat-offline" role="status">
          <span className="meeting-chat-offline-spinner" />
          Mất kết nối chat. Đang kết nối lại… Tin nhắn mới sẽ hiện khi kết
          nối lại.
        </div>
      )}
      <div className="meeting-chat-body">
        <div className="meeting-chat-notice">
          Tin nhắn chỉ hiển thị với những người tham gia cuộc họp và sẽ bị xóa
          khi cuộc họp kết thúc
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
          placeholder={canSend ? 'Nhập tin nhắn...' : 'Chủ phòng đã tắt chat'}
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
          aria-label="Gửi"
        >
          <Icon name="send" />
        </button>
      </div>
    </div>
  );
}
