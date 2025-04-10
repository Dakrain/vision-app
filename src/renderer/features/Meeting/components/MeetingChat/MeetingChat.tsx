import Icon from '@/assets/svg/icons';
import { ChatBubble } from '@/renderer/shared/components';
import { useAppDispatch } from '@/renderer/store';
import { useAuth } from '@/shared/hooks';
import { Input } from 'antd';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { sendChat } from '../../store/action';
import { selectChats } from '../../store/selector';
import './MeetingChat.scss';
import { MeetingChatProps } from './types';

export function MeetingChat({ sendMessage }: MeetingChatProps) {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const { meetingId } = useLocation().state;
  const chats = useSelector(selectChats);
  const [message, setMessage] = useState('');
  const sendChatMessage = () => {
    if (!message) return;

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

  return (
    <div className="chat-container">
      <div className="chat-header">Tin nhắn trong cuộc họp</div>
      <div className="chat-notice">
        Tin nhắn chỉ hiển thị với những người tham gia cuộc họp và sẽ bị xóa khi
        cuộc họp kết thúc
      </div>
      <div className="chat-messages">
        {chats.map((chat, index) => (
          <ChatBubble
            key={chat.id}
            message={chat}
            showSender={index === 0 || chats[index - 1].userId !== chat.userId}
            isMe={chat.userId === user?.id}
          />
        ))}
      </div>
      <div className="chat-input">
        <Input
          placeholder="Nhập tin nhắn..."
          suffix={<button className="send-icon" onClick={() => sendChatMessage()}><Icon name="send" /></button>}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPressEnter={() => sendChatMessage()}
        />
      </div>
    </div>
  );
}
