import { Avatar } from '../Avatar/Avatar';
import './ChatBubble.scss';
import type { ChatBubbleProps } from './type';

export function ChatBubble({ message, showSender, isMe }: ChatBubbleProps) {
  const messageTime = new Date(
    (message.createdAt ?? 0) * 1000,
  ).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderMessageContent = () => {
    if (message.messageType === 'file') {
      return (
        <div className="chat-bubble-file-container">
          <img
            className="chat-bubble-file"
            src={message.file?.url}
            alt="file"
          />
        </div>
      );
    }
    return <div className="chat-bubble-message">{message.message}</div>;
  };

  const renderAvatar = () => {
    if (isMe) return null;

    return showSender ? (
      <Avatar
        url={message.avatar || ''}
        radius={12}
        name={message.userName ?? 'Vision20'}
        className="chat-bubble-avatar"
      />
    ) : (
      <div className="chat-bubble-avatar-placeholder" />
    );
  };

  return (
    <div className={`chat-bubble ${isMe ? '-me' : ''}`}>
      {renderAvatar()}
      <div className="chat-bubble-content">
        {!isMe && showSender && (
          <div className="chat-bubble-name">
            {message.userName ?? 'Vision20'}
          </div>
        )}
        <div className={`chat-bubble-container ${isMe ? '-me' : ''}`}>
          {renderMessageContent()}
          <div className="chat-bubble-time">{messageTime}</div>
        </div>
      </div>
    </div>
  );
}
