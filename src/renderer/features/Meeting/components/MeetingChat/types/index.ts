import { MeetingChat } from '@/renderer/shared/types/meeting';

export interface MeetingChatProps {
  sendMessage: (message: MeetingChat) => void;
}
