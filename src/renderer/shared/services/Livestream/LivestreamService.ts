import BaseService from '@/shared/network/base.service';
import {
  LivestreamDestination,
  LivestreamLayout,
  LivestreamPlatform,
  MeetingLivestream,
} from '@/renderer/shared/types/livestream';
import { API_BASE_URL } from '../../config';

export interface SaveDestinationRequest {
  platform: LivestreamPlatform;
  name?: string;
  serverUrl?: string;
  streamKey?: string;
}

class LivestreamService extends BaseService {
  async fetchDestinations(): Promise<{ rows: LivestreamDestination[] }> {
    return this.get('/livestream/destinations');
  }

  async createDestination(
    request: SaveDestinationRequest,
  ): Promise<LivestreamDestination> {
    return this.post('/livestream/destinations', request);
  }

  async deleteDestination(id: number): Promise<void> {
    return this.delete(`/livestream/destinations/${id}`);
  }

  async fetchStatus(
    meetingId: number,
  ): Promise<{ isLive: number; rows: MeetingLivestream[] }> {
    return this.get(`/meeting/${meetingId}/livestream`);
  }

  async start(
    meetingId: number,
    destinationIds: number[],
    layout?: LivestreamLayout,
  ): Promise<{ rows: MeetingLivestream[] }> {
    return this.post(`/meeting/${meetingId}/livestream/start`, {
      destinationIds,
      layout,
    });
  }

  async stop(meetingId: number, livestreamId?: number): Promise<void> {
    return this.post(`/meeting/${meetingId}/livestream/stop`, {
      livestreamId,
    });
  }

  async updateLayout(
    meetingId: number,
    layout: LivestreamLayout,
  ): Promise<{ updated: number }> {
    return this.put(`/meeting/${meetingId}/livestream/layout`, layout);
  }
}

export default new LivestreamService({ baseURL: API_BASE_URL });
