import {
  JoinMeetingStatus,
  Meeting,
  MeetingChat,
  MeetingUser,
} from '@/renderer/shared/types/meeting';
import BaseService from '@/shared/network/base.service';
import { PageResponse } from '@/shared/network/response';
import {
  JoinMeetingRequest,
  CreateMeetingRequest,
  UpdateUserConfigRequest,
  SendChatRequest,
} from './request';

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
  baseURL: 'https://api.vision20.us/v1',
});
