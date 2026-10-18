import { Call, CallEventName } from '@/renderer/shared/types/call';
import { camelizeKeys } from 'humps';
import { API_BASE_URL } from '../../config';

export interface CallEventsHandlers {
  onEvent: (event: CallEventName, call: Call) => void;
  /** Stream (re)opened: resync, events may have been missed meanwhile. */
  onOpen?: () => void;
}

const BACKOFF_MIN_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
/** The server sends a heartbeat comment every 25 s. */
const IDLE_TIMEOUT_MS = 60_000;

const appPlatform = () =>
  navigator.userAgent.includes('Mac') ? 'MacOs' : 'Windows';

/**
 * `GET /v1/call/events` (Server-Sent Events). EventSource can't send the
 * Authorization header, so this reads the stream with fetch, and reconnects
 * with exponential backoff (1 s → 30 s, ±20 % jitter) when it drops or goes
 * silent for longer than the heartbeat allows.
 */
export class CallEvents {
  private controller?: AbortController;

  private retryTimer?: ReturnType<typeof setTimeout>;

  private idleTimer?: ReturnType<typeof setTimeout>;

  private attempt = 0;

  private running = false;

  private readonly token: string;

  private readonly handlers: CallEventsHandlers;

  constructor(token: string, handlers: CallEventsHandlers) {
    this.token = token;
    this.handlers = handlers;
  }

  start() {
    if (this.running) return;
    this.running = true;
    window.addEventListener('online', this.reconnectNow);
    this.connect();
  }

  stop() {
    this.running = false;
    window.removeEventListener('online', this.reconnectNow);
    clearTimeout(this.retryTimer);
    clearTimeout(this.idleTimer);
    this.controller?.abort();
    this.controller = undefined;
  }

  private reconnectNow = () => {
    if (!this.running) return;
    this.attempt = 0;
    this.controller?.abort();
    clearTimeout(this.retryTimer);
    this.connect();
  };

  private scheduleReconnect() {
    if (!this.running) return;
    clearTimeout(this.idleTimer);
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** this.attempt);
    const delay = Math.round(base * (0.8 + Math.random() * 0.4));
    this.attempt += 1;
    clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => this.connect(), delay);
  }

  private armIdleTimer(controller: AbortController) {
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => controller.abort(), IDLE_TIMEOUT_MS);
  }

  private async connect() {
    const controller = new AbortController();
    this.controller = controller;
    try {
      this.armIdleTimer(controller);
      const res = await fetch(`${API_BASE_URL}/call/events`, {
        headers: {
          appplatform: appPlatform(),
          Authorization: `Bearer ${this.token}`,
          Accept: 'text/event-stream',
        },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (
        !res.ok ||
        !res.body ||
        !res.headers.get('content-type')?.includes('text/event-stream')
      ) {
        throw new Error(`call events: HTTP ${res.status}`);
      }
      this.attempt = 0;
      this.handlers.onOpen?.();
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        // eslint-disable-next-line no-await-in-loop
        const { value, done } = await reader.read();
        if (done) break;
        this.armIdleTimer(controller);
        buffer += decoder
          .decode(value, { stream: true })
          .replace(/\r\n?/g, '\n');
        let end = buffer.indexOf('\n\n');
        while (end >= 0) {
          this.dispatch(buffer.slice(0, end));
          buffer = buffer.slice(end + 2);
          end = buffer.indexOf('\n\n');
        }
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      if (e?.name !== 'AbortError') console.warn('[call] event stream', e);
    }
    if (this.controller === controller) this.scheduleReconnect();
  }

  private dispatch(frame: string) {
    let event = '';
    const data: string[] = [];
    frame.split('\n').forEach((line) => {
      if (!line || line.startsWith(':')) return; // comment / heartbeat
      const colon = line.indexOf(':');
      const field = colon < 0 ? line : line.slice(0, colon);
      const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
      if (field === 'event') event = value;
      else if (field === 'data') data.push(value);
    });
    if (!event.startsWith('call:') || !data.length) return;
    try {
      const call = camelizeKeys(JSON.parse(data.join('\n'))) as Call;
      this.handlers.onEvent(event as CallEventName, call);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[call] bad event', event, e);
    }
  }
}
