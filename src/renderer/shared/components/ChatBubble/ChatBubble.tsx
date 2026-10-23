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
        <div className="meeting-bubble-file-container">
          <img
            className="meeting-bubble-file"
            src={message.file?.url}
            alt="file"
          />
        </div>
      );
    }
    return <div className="meeting-bubble-message">{message.message}</div>;
  };

  const renderAvatar = () => {
    if (isMe) return null;

    return showSender ? (
      <Avatar
        url={message.avatar || ''}
        radius={12}
        name={message.userName ?? 'Vision20'}
        className="meeting-bubble-avatar"
      />
    ) : (
      <div className="meeting-bubble-avatar-placeholder" />
    );
  };

  return (
    <div
      className={`meeting-bubble${isMe ? ' -me' : ''}${showSender ? ' -first' : ''}`}
    >
      {renderAvatar()}
      <div className="meeting-bubble-content">
        {!isMe && showSender && (
          <div className="meeting-bubble-name">
            {message.userName ?? 'Vision20'}
          </div>
        )}
        <div className="meeting-bubble-container">
          {renderMessageContent()}
          <div className="meeting-bubble-time">{messageTime}</div>
        </div>
      </div>
    </div>
  );
}
