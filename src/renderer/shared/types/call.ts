// 1:1 calls owned by the Vision API (vision-api/docs/call-api.md). Keys are
// camelized by BaseService / the event stream.

export type CallStatus =
  | 'ringing'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'missed'
  | 'ended';

export type CallType = 'audio' | 'video';

export interface CallParty {
  id: number;
  fullName?: string;
  avatar?: string;
}

export interface Call {
  /** Public uuid. */
  id: string;
  status: CallStatus;
  type: CallType;
  endReason?: string | null;
  caller: CallParty;
  callee: CallParty;
  /** Unix seconds; 0 when not reached yet. */
  createdAt: number;
  acceptedAt: number;
  endedAt: number;
  serverTime: number;
}

/** This device's own Agora credentials for the call room. */
export interface CallMedia {
  channel: string;
  token: string;
  uid: number;
}

export interface CallWithMedia {
  call?: Call | null;
  media?: CallMedia | null;
}

export type CallEventName = 'call:incoming' | 'call:updated' | 'call:missed';

export const TERMINAL_CALL_STATUSES: CallStatus[] = [
  'rejected',
  'cancelled',
  'missed',
  'ended',
];

export const isTerminalCall = (call: Call) =>
  TERMINAL_CALL_STATUSES.includes(call.status);
