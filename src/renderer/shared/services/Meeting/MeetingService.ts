import {
  JoinMeetingStatus,
  Meeting,
  MeetingChat,
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

class MeetingService extends BaseService {
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

  async fetchMeetings(
    pageNumber?: number,
    limit?: number,
    status?: number,
    startTime?: number,
    role?: string,
    sort?: string,
  ): Promise<any> {
    const params = {
      page_number: pageNumber,
      limit,
      status,
      start_time: startTime,
      role,
      sort,
    };

    return this.get('/meeting/list', {
      params,
    });
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

  async fetchMeetingDetail(meetingId: number): Promise<Meeting> {
    return this.get(`/meeting/${meetingId}`);
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
