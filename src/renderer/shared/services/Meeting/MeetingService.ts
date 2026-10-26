import {
  JoinMeetingStatus,
  Meeting,
  MeetingChat,
  MeetingListPage,
  MeetingUser,
  RoomSettings,
} from '@/renderer/shared/types/meeting';
import BaseService from '@/shared/network/base.service';
import { User } from '@/renderer/shared/types/user';
import { PageResponse } from '@/shared/network/response';
import {
  JoinMeetingRequest,
  CreateMeetingRequest,
  UpdateUserConfigRequest,
  SendChatRequest,
} from './request';
import { API_BASE_URL } from '../../config';

/**
 * Meetings this app joined as the account's second device: every detail
 * fetch (join, token renewal, resync) must then ask for that device's own
 * uid and tokens, or it would take over the first device's connection.
 */
const companionMeetings = new Set<number>();

class MeetingService extends BaseService {
  setCompanion(meetingId: number, companion: boolean) {
    if (companion) companionMeetings.add(meetingId);
    else companionMeetings.delete(meetingId);
  }

  isCompanion(meetingId: number) {
    return companionMeetings.has(meetingId);
  }

  /** Is this account already in the meeting on another device? */
  async fetchMyDevices(
    meetingId: number,
  ): Promise<{ known: number; main: number; companion: number }> {
    return this.get(`/meeting/${meetingId}/devices`);
  }

  async joinMeeting(request: JoinMeetingRequest): Promise<JoinMeetingStatus> {
    return this.post('/meeting/request', request);
  }

  async createMeeting(request: CreateMeetingRequest): Promise<Meeting> {
    return this.post('/meeting/', request);
  }

  async leaveMeeting(meetingId: number): Promise<void> {
    return this.post(`/meeting/${meetingId}/exit`, {
      leave: true,
    });
  }

  async endMeeting(meetingId: number): Promise<void> {
    return this.post(`/meeting/${meetingId}/end`, {});
  }

  /** My meetings (any role), newest first unless `sort` says otherwise. */
  async fetchMeetings(params: {
    status?: number;
    pageNumber?: number;
    sort?: string;
  }): Promise<MeetingListPage> {
    return this.get('/meeting', {
      params: {
        status: params.status,
        page_number: params.pageNumber,
        sort: params.sort,
      },
    });
  }

  /** Host: open a scheduled meeting (status NEW → GOING_ON). */
  async startMeeting(meetingId: number): Promise<Meeting> {
    return this.post(`/meeting/${meetingId}/start`, {});
  }

  /** Host: rename / re-describe a meeting. */
  async updateMeeting(
    meetingId: number,
    request: { title?: string; description?: string },
  ): Promise<{ success: boolean }> {
    return this.put(`/meeting/${meetingId}`, request);
  }

  async fetchMeetingUsers(
    meetingId: number,
  ): Promise<PageResponse<MeetingUser>> {
    return this.get(`/meeting/${meetingId}/user`);
  }

  // ---- Host controls (host/co-host). After each call the app broadcasts the
  // matching RTM ACTION so the affected clients react immediately. Muting
  // needs no server call: see useMeeting.

  async kickUser(
    meetingId: number,
    userId: number,
    ban: boolean,
  ): Promise<{ agUid: number; banned: number }> {
    return this.post(`/meeting/${meetingId}/user/${userId}/kick`, {
      ban: ban ? 1 : 0,
    });
  }

  /** Adds a user to the meeting, or changes an existing member's role. */
  async setMemberRole(
    meetingId: number,
    userId: number,
    role: number,
  ): Promise<{ status: boolean }> {
    return this.post(`/meeting/${meetingId}/user`, { userId, role });
  }

  /**
   * Host/co-host: change what members may do (only the fields sent change).
   * Returns the room's full settings afterwards.
   */
  async updateRoomSettings(
    meetingId: number,
    settings: RoomSettings,
  ): Promise<{ success: boolean; setting: RoomSettings }> {
    return this.put(`/meeting/${meetingId}`, settings);
  }

  /** Waiting room: let someone in (APPROVED) or turn them away (REJECTED). */
  async reviewWaitingMember(
    meetingId: number,
    userId: number,
    status: number,
  ): Promise<{ status: boolean }> {
    return this.put(`/meeting/${meetingId}/user/${userId}`, { status });
  }

  async findUsers(email: string): Promise<PageResponse<User>> {
    return this.get('/user/find', { params: { email } });
  }

  /** Users whose email (or phone) starts with `query` — for type-ahead. */
  async searchUsers(query: string): Promise<PageResponse<User>> {
    return this.get('/user/find', { params: { query } });
  }

  /** Host: remove a meeting that isn't running (from everyone's list). */
  async deleteMeeting(meetingId: number): Promise<{ success: boolean }> {
    return this.delete(`/meeting/${meetingId}`);
  }

  async fetchMeetingDetail(meetingId: number): Promise<Meeting> {
    return this.get(`/meeting/${meetingId}`, {
      params: companionMeetings.has(meetingId)
        ? { device: 'companion' }
        : undefined,
    });
  }

  async updateSetting(
    meetingId: number,
    request: UpdateUserConfigRequest,
  ): Promise<void> {
    return this.put(`/meeting/${meetingId}/setting`, request);
  }

  async sendChat(
    meetingId: number,
    request: SendChatRequest,
  ): Promise<MeetingChat> {
    return this.post(`/meeting/${meetingId}/chat`, request);
  }

  async fetchChats(meetingId: number): Promise<PageResponse<MeetingChat>> {
    return this.get(`/meeting/${meetingId}/chat`);
  }
}

export default new MeetingService({
  baseURL: API_BASE_URL,
});
