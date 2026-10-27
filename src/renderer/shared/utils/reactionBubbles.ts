/**
 * Pure helpers for the floating reaction bubbles (Teams-style Heart/Like/
 * Clap): they fly up and fade on every client, sender included, instead of
 * sticking to a tile. Hand stays a persistent tile badge and does not go
 * through here (see useMeeting's sendReaction/handleReaction). The mobile
 * app's reaction bar carries a copy of this logic.
 */

export type BubbleKind = 'heart' | 'like' | 'clap';

/** `message_content` values that fly up instead of sticking to a tile. */
const BUBBLE_KINDS: Record<string, BubbleKind> = {
  HEART: 'heart',
  LIKE: 'like',
  CLAP: 'clap',
};

/** Hand/none (and anything unknown) are not bubbles. */
export const bubbleKind = (content: string): BubbleKind | undefined =>
  BUBBLE_KINDS[String(content).toUpperCase()];

export interface ReactionBubble {
  id: string;
  kind: BubbleKind;
  /** "Bạn" for myself, else the sender's name. */
  name: string;
  /** Start position, percent from the left (Teams spreads these lower-right-ish). */
  left: number;
  /** Which sideways-drift variant the CSS animation should use. */
  drift: number;
}

/** At most this many bubbles animate at once; the oldest are dropped. */
export const MAX_BUBBLES = 20;

let seq = 0;

/** Teams-style spread: lower-right-ish, a few drift variants. */
const START_LEFT_MIN = 55;
const START_LEFT_SPAN = 37;
const DRIFT_VARIANTS = 3;

/** A new bubble for `kind`, started at a random lower-right-ish spot. */
export const makeBubble = (kind: BubbleKind, name: string): ReactionBubble => {
  seq += 1;
  return {
    id: `${Date.now()}-${seq}`,
    kind,
    name,
    left: START_LEFT_MIN + Math.random() * START_LEFT_SPAN,
    drift: Math.floor(Math.random() * DRIFT_VARIANTS),
  };
};

/** Appends a bubble, dropping the oldest once the cap is hit. */
export const addBubble = (
  bubbles: ReactionBubble[],
  bubble: ReactionBubble,
): ReactionBubble[] => {
  const next = [...bubbles, bubble];
  return next.length > MAX_BUBBLES
    ? next.slice(next.length - MAX_BUBBLES)
    : next;
};

/** How long after sending a bubble the hand state is resent. */
const RESTORE_MS = 3000;

/**
 * Old, already-installed apps treat ROOM_REACTION as sticky tile state, so
 * a moment after an ephemeral Heart/Like/Clap goes out, the current hand
 * state is resent to make their tile self-clear. Rapid-fire reactions must
 * only trigger one restore, timed from the last one.
 */
export class ReactionRestore {
  private timer?: ReturnType<typeof setTimeout>;

  /** (Re)schedules `restore`, `RESTORE_MS` after the most recent call. */
  schedule(restore: () => void) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(restore, RESTORE_MS);
  }

  cancel() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
}
