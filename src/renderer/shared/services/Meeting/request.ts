export interface JoinMeetingRequest {
  visionMeetingKey: string;
  visionMeetingPwd: string;
}

export interface Invite {
  userId?: number;
  role?: number;
}

export interface CreateMeetingRequest {
  id?: number;
  title?: string;
  password?: string;
  limitUser?: number;
  description?: string;
  startTime?: number;
  waitingRoom?: number;
  muteAllVideo?: number;
  muteAllAudio?: number;
  muteAllChat?: number;
  isRecording?: number;
  multipleShareScreen?: number;
  invite?: Invite[];
}

export interface SendChatRequest {
  message?: string;
  type?: string;
  fileId?: number;
}

export interface UpdateUserConfigRequest {
  /**
   * Id user sẽ được cập nhật
   * - Member: truyền id của mình (có thể bỏ qua)
   * - Host: truyền user_id mà host muốn tắt/bật cấu hình
   */
  user_id?: string;

  /**
   * Bật/tắt video
   * @example 1: Bật, 0: Tắt
   */
  enable_video?: 0 | 1;

  /**
   * Bật/tắt audio
   * @example 1: Bật, 0: Tắt
   */
  enable_audio?: 0 | 1;

  /**
   * Share screen status
   * @example 1: Bật, 0: Tắt
   * @note Host không được phép cập nhật thông tin này, chỉ user muốn share_screen gọi
   */
  share_screen?: 0 | 1;
}

// Constants cho các giá trị
export const ConfigStatus = {
  ENABLED: 1,
  DISABLED: 0,
} as const;

// Type helper
export type ConfigStatusType = (typeof ConfigStatus)[keyof typeof ConfigStatus];
