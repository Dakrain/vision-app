import { MeetingChat } from '@/renderer/shared/types/meeting';

export interface ChatBubbleProps {
  message: MeetingChat;
  showSender?: boolean;
  isMe?: boolean;
}
