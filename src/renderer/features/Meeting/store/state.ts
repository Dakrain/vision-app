import { AppError } from '@/shared/network/response';
import {
  Meeting,
  MeetingChat,
  MeetingUser,
} from '@/renderer/shared/types/meeting';

export type StateType = {
  error?: AppError;
  meetingUsers: MeetingUser[];
  meetingDetail?: Meeting | undefined;
  agoraMembers: number[];
  chats: MeetingChat[];
  cameraOn: boolean;
  microphoneOn: boolean;
  speakerOn: boolean;
  sharingScreen: boolean;
};
