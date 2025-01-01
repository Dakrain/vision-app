import { ChatBubble } from '@/renderer/shared/components';
import { Input } from 'antd';
import Icon from '@/assets/svg/icons';
import './MeetingChat.scss';
import { useAuth } from '@/shared/hooks';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useAppDispatch } from '@/renderer/store';
import { useState } from 'react';
import { selectChats } from '../../store/selector';
import { sendChat } from '../../store/action';
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
          suffix={<Icon name="send" />}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onPressEnter={() => sendChatMessage()}
        />
      </div>
    </div>
  );
}
