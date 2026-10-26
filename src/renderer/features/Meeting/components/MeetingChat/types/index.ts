import { MeetingChat } from '@/renderer/shared/types/meeting';

export interface MeetingChatProps {
  sendMessage: (message: MeetingChat) => void;
  /** False when the host turned chat off for members. */
  canSend?: boolean;
  /** Chat (RTM) is connected; otherwise show that it is reconnecting. */
  online?: boolean;
}
