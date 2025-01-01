/*
 * Roles trong meeting:
 * - HOST (1): Người tạo và quản lý chính của meeting
 * - CO_HOST (2): Người được host chỉ định để hỗ trợ quản lý meeting
 * - MEMBER (3): Người tham gia meeting thông thường
 */
export enum MeetingRole {
  HOST = 1,
  CO_HOST = 2,
  MEMBER = 3,
}

/*
  1: Tham gia nhưng chưa được host duyệt, Chưa được vào phòng
  2: Đã được duyệt, có thể vào phòng họp
  3: Bị từ chối, không thể vào phòng
*/
export enum MemberStatus {
  PENDING = 1,
  APPROVED = 2,
  REJECTED = 3,
}

export interface Room {
  id?: number;
  title?: string;
  visionMeetingKey?: string;
  visionMeetingPwd?: string;
  limitUser?: number;
  description?: string;
  status?: number;
  joinUrl?: string;
  startTime?: number;
  roomId?: string;
  roomUuid?: string;
  channelName?: string;
  meetingId?: string;
  meetingRoomUid?: string;
  enableVideo?: number;
  hostId?: number;
  ownerId?: number;
  hostName?: string;
  enableAudio?: number;
  createdAt?: number;
  waitingRoom?: number;
  enableChat?: number;
  isRecording?: number;
  multipleShareScreen?: number;
  ownerFullName?: string;
}
/*
  1: Host
  2: Co-host
  3: Member
*/
export interface MeetingUser {
  id?: number;
  userId?: number;
  isJoin?: number;
  enableVideo?: number;
  enableAudio?: number;
  role?: number;
  invitedBy?: number;
  status?: number;
  isOwner?: number;
  agUid?: number;
  agRtcToken?: string;
  fullName?: string;
  agRtmToken?: string;
  agScreenToken?: string;
  avatarUrl?: string;
}

export interface Host {
  id?: number;
  agUid?: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  avatar?: number;
  avatarUrl?: string;
}

export interface Meeting {
  room?: Room;
  user?: MeetingUser;
  host?: Host;
}

export interface JoinMeetingStatus {
  id?: number;
  userId?: number;
  memberId?: number;
  role?: number;
  status?: number;
}
export interface MeetingFile {
  type?: string;
  url?: string;
}

export interface MeetingChat {
  id?: string;
  userName?: string;
  avatar?: string;
  messageType?: string;
  message?: string;
  userId?: number;
  createdAt?: number;
  file?: MeetingFile;
}

export interface AgoraRtmMessage {
  message_type: string;
  message_sub_type?: string | null;
  message_content: any;
}
