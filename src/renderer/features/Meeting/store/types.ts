import {
  SendChatRequest,
  UpdateUserConfigRequest,
} from '@/renderer/shared/services/Meeting/request';
import { MeetingChat } from '@/renderer/shared/types/meeting';
import { User } from '@/renderer/shared/types/user';

export interface UpdateUserConfigPayload {
  meetingId: number;
  request: UpdateUserConfigRequest;
}

export interface SendChatPayload {
  meetingId: number;
  request: SendChatRequest;
  user: User;
  callback: (message: MeetingChat) => void;
}
