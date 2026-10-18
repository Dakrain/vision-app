export type LivestreamPlatform = 'youtube' | 'facebook' | 'custom';

export type LivestreamStatus =
  | 'starting'
  | 'live'
  | 'failed'
  | 'stopping'
  | 'stopped';

/** A streaming destination saved by the user: their own channel/page. */
export interface LivestreamDestination {
  id: number;
  platform: LivestreamPlatform;
  name: string;
  serverUrl: string;
  streamKeyMasked: string;
}

/** One push of a meeting to one destination. */
export interface MeetingLivestream {
  id: number;
  meetingId: number;
  destinationId: number | null;
  platform: LivestreamPlatform;
  name: string;
  status: LivestreamStatus;
  errorReason: string;
  startedAt: number;
}

/** Room state the host reports so the cloud layout follows the meeting. */
export interface LivestreamLayout {
  uids: number[];
  shareUid?: number;
  speakerUid?: number;
}
