/**
 * Keeps one meeting whiteboard (Excalidraw scene) in sync over the meeting's
 * RTM channel. No server: every client holds the scene; edits go out as the
 * elements that changed, and a newcomer asks for the whole scene.
 *
 * RTM messages (ACTION sub types, `content.id` = the board's session id):
 * - `WB_ELEMENTS {id, els}`: changed elements (chunked under RTM's ~32KB).
 * - `WB_SYNC {id}`: "send me everything" (answered by the board's owner).
 *
 * Conflicts follow Excalidraw's own rule: the higher `version` wins, a tie
 * goes to the lower `versionNonce`. Deletions are elements with `isDeleted`.
 * Excalidraw edits its element objects in place, so versions are compared
 * against numbers recorded here, never against the objects themselves.
 * The mobile app's whiteboard page carries a copy of this logic.
 */

export type WhiteboardElement = {
  id: string;
  version: number;
  versionNonce: number;
  /** Fractional z-order index (Excalidraw 0.18+). */
  index?: string | null;
  [key: string]: unknown;
};

type Send = (subType: string, content: unknown) => void;

/** Characters per message: RTM refuses texts over 32KB (UTF-8). */
const MAX_CHUNK = 24000;
/** Local edits are batched: a stroke changes many times a second. */
const FLUSH_MS = 120;
/** Between the chunks of a full scene (RTM rate limit). */
const CHUNK_GAP_MS = 60;

type Seen = { version: number; nonce: number };

/** Someone else's copy beats mine (Excalidraw's reconcile rule). */
const wins = (el: WhiteboardElement, seen: Seen | undefined) =>
  !seen ||
  el.version > seen.version ||
  (el.version === seen.version && el.versionNonce < seen.nonce);

/** My own copy moved on since it was last recorded. */
const edited = (el: WhiteboardElement, seen: Seen | undefined) =>
  !seen || el.version !== seen.version || el.versionNonce !== seen.nonce;

/** Splits elements into messages that fit through RTM. */
const chunks = (elements: WhiteboardElement[]) => {
  const out: WhiteboardElement[][] = [];
  let batch: WhiteboardElement[] = [];
  let size = 0;
  elements.forEach((el) => {
    const n = JSON.stringify(el).length;
    if (batch.length && size + n > MAX_CHUNK) {
      out.push(batch);
      batch = [];
      size = 0;
    }
    batch.push(el);
    size += n;
  });
  if (batch.length) out.push(batch);
  return out;
};

export class WhiteboardSync {
  /** Session id of the board being shown (a new board starts empty). */
  id?: string;

  private scene = new Map<string, WhiteboardElement>();

  private seen = new Map<string, Seen>();

  /** Elements I drew: Excalidraw drops some (empty shapes) without a trace. */
  private mine = new Set<string>();

  private pending = new Map<string, WhiteboardElement>();

  private timer?: ReturnType<typeof setTimeout>;

  private listeners = new Set<() => void>();

  private readonly send: Send;

  constructor(send: Send) {
    this.send = send;
  }

  /** Starts showing board `id`, empty unless it is the one already held. */
  open(id: string) {
    if (this.id === id) return;
    this.id = id;
    this.scene.clear();
    this.pending.clear();
    this.seen.clear();
    this.mine.clear();
    this.notify();
  }

  close() {
    this.id = undefined;
    this.scene.clear();
    this.pending.clear();
    this.seen.clear();
    this.mine.clear();
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }

  /** The scene in z-order. */
  elements(): WhiteboardElement[] {
    return [...this.scene.values()].sort((a, b) => {
      const x = a.index ?? '';
      const y = b.index ?? '';
      if (x === y) return 0;
      return x < y ? -1 : 1;
    });
  }

  /** Excalidraw's onChange: queue whatever I changed. */
  local(elements: readonly WhiteboardElement[]) {
    if (!this.id) return;
    let changed = false;
    const present = new Set<string>();
    elements.forEach((el) => {
      present.add(el.id);
      if (!edited(el, this.seen.get(el.id))) return;
      this.record(el);
      this.mine.add(el.id);
      this.pending.set(el.id, el);
      changed = true;
    });
    // Gone from Excalidraw without being deleted (a shape drawn with no
    // size): delete it everywhere else too.
    this.mine.forEach((id) => {
      if (present.has(id)) return;
      this.mine.delete(id);
      const el = this.scene.get(id);
      if (!el || el.isDeleted) return;
      const gone = {
        ...el,
        isDeleted: true,
        version: el.version + 1,
        versionNonce: Math.floor(Math.random() * 2 ** 31),
      };
      this.record(gone);
      this.pending.set(id, gone);
      changed = true;
    });
    if (changed && !this.timer) {
      this.timer = setTimeout(() => this.flush(), FLUSH_MS);
    }
  }

  /** Elements from someone else; listeners redraw when anything changed. */
  remote(id: string, elements: WhiteboardElement[]) {
    if (id !== this.id || !Array.isArray(elements)) return;
    let changed = false;
    elements.forEach((el) => {
      if (!el?.id || !wins(el, this.seen.get(el.id))) return;
      this.record(el);
      this.pending.delete(el.id);
      changed = true;
    });
    if (changed) this.notify();
  }

  /** Asks the owner for the whole board (after joining or reconnecting). */
  requestAll() {
    if (this.id) this.send('WB_SYNC', { id: this.id });
  }

  /** Sends the whole board, a chunk at a time. */
  sendAll() {
    const { id } = this;
    if (!id) return;
    chunks(this.elements()).forEach((els, i) => {
      setTimeout(() => {
        if (this.id === id) this.send('WB_ELEMENTS', { id, els });
      }, i * CHUNK_GAP_MS);
    });
  }

  /** Called when remote changes arrive; returns the unsubscribe. */
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private record(el: WhiteboardElement) {
    this.scene.set(el.id, el);
    this.seen.set(el.id, { version: el.version, nonce: el.versionNonce });
  }

  private flush() {
    this.timer = undefined;
    const { id } = this;
    if (!id || this.pending.size === 0) return;
    const els = [...this.pending.values()];
    this.pending.clear();
    chunks(els).forEach((chunk) =>
      this.send('WB_ELEMENTS', { id, els: chunk }),
    );
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }
}
