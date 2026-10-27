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
  // Room permissions for plain members (1 = allowed). Despite the names,
  // the mute_all_* flags mean "may turn on".
  muteAllAudio?: number;
  muteAllVideo?: number;
  muteAllChat?: number;
  allowLivestream?: number;
}

/** What plain members may do in a room; host/co-host may always. */
export type RoomSettings = Pick<
  Room,
  | 'muteAllAudio'
  | 'muteAllVideo'
  | 'muteAllChat'
  | 'isRecording'
  | 'multipleShareScreen'
  | 'allowLivestream'
>;

export interface RoomPermissions {
  mic: boolean;
  camera: boolean;
  chat: boolean;
  share: boolean;
  record: boolean;
  livestream: boolean;
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
  /** RTC token for agAuxUid (the camera kept on while sharing). */
  agScreenToken?: string;
  /** Uid of the camera kept on while this connection shares its screen. */
  agAuxUid?: number;
  /** 0: main device, 1: the account's second device in this meeting. */
  deviceSlot?: number;
  avatarUrl?: string;
  reaction?: string; //Use for view only
  isScreenShare?: boolean;
  /** Present via RTM/server but no RTC media yet/anymore. View only. */
  connecting?: boolean;
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

/** Room status: scheduled, running, finished. */
export enum MeetingStatus {
  NEW = 1,
  GOING_ON = 2,
  ENDED = 3,
}

/** A row of GET /meeting (the meetings I am a member of). */
export interface MeetingListItem {
  id: number;
  title?: string;
  /** Scheduled start, unix seconds; 0 when started right away. */
  startTime?: number;
  createdAt?: number;
  joinUrl?: string;
  visionMeetingKey?: string;
  visionMeetingPwd?: string;
  description?: string;
  role?: number;
  isHost?: number;
  status?: number;
  ownerId?: number;
  ownerFullName?: string;
}

export interface MeetingListPage {
  total: number;
  pageSize: number;
  pageNumber: number;
  rows: MeetingListItem[];
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

/** One entry of GET /meeting/:id/roster — a presence source independent of Agora. */
export interface RosterMember {
  agUid?: number;
  userId?: number;
  kind?: 'main' | 'companion' | 'aux';
  fullName?: string;
  avatarUrl?: string;
  role?: number;
}

/**
 * Server-side view of who is in the room, polled alongside RTC/RTM so a
 * dropped Agora event doesn't make someone vanish from the roster — see
 * shared/utils/meetingRoster.ts.
 */
export interface MeetingRoster {
  channel?: string;
  /** When this snapshot was taken, unix ms. */
  fetchedAt?: number;
  /** False on a transient failure: keep the previous snapshot instead. */
  available?: boolean;
  uids?: number[];
  members?: RosterMember[];
}
