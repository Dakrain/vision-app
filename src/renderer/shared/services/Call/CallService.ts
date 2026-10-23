import BaseService from '@/shared/network/base.service';
import { Call, CallType, CallWithMedia } from '@/renderer/shared/types/call';
import { camelizeKeys } from 'humps';
import { API_BASE_URL } from '../../config';

export interface CallApiError {
  status?: number;
  code?: string;
  /** Current state of the call, sent with 409s (`e_call_state`, `e_call_busy`). */
  call?: Call;
}

/** Reads the API error out of BaseService's stringified rejection. */
export function parseCallError(e: unknown): CallApiError {
  try {
    const err = JSON.parse(String(e));
    const data = err?.response?.data ?? {};
    return {
      status: err?.response?.status,
      code: data.code,
      call: data.call ? (camelizeKeys(data.call) as Call) : undefined,
    };
  } catch (_) {
    return {};
  }
}

/**
 * 1:1 calls. The server is the only writer of a call's status: these are
 * intents, and the answer (or a 409 carrying the current call) is the truth.
 */
class CallService extends BaseService {
  /** Rings the callee. `media` = my (the caller's) Agora credentials. */
  async place(calleeId: number, type: CallType): Promise<CallWithMedia> {
    return this.post('/call', { calleeId, type });
  }

  async accept(id: string): Promise<CallWithMedia> {
    return this.post(`/call/${id}/accept`, {});
  }

  /** Callee declines; `reason: 'busy'` when auto-rejecting. */
  async reject(id: string, reason?: string): Promise<CallWithMedia> {
    return this.post(`/call/${id}/reject`, reason ? { reason } : {});
  }

  /** Caller hangs up while it still rings. */
  async cancel(id: string): Promise<CallWithMedia> {
    return this.post(`/call/${id}/cancel`, {});
  }

  /**
   * Either side, any live state. [reason] is a short code shared with
   * mobile: 'peer_lost' (the other side dropped) or 'connection_lost'.
   */
  async end(id: string, reason?: string): Promise<CallWithMedia> {
    return this.post(`/call/${id}/end`, reason ? { reason } : {});
  }

  /** `media` is included while accepted: rejoin or renew the Agora token. */
  async fetchCall(id: string): Promise<CallWithMedia> {
    return this.get(`/call/${id}`);
  }

  /** My ringing/accepted call, if any. Empty values when there is none. */
  async fetchActive(): Promise<CallWithMedia> {
    return this.get('/call/active');
  }

  async fetchHistory(
    page = 1,
    limit = 20,
  ): Promise<{ rows: Call[]; page: number; limit: number }> {
    return this.get('/call', { params: { page, limit } });
  }
}

export default new CallService({
  baseURL: API_BASE_URL,
});
