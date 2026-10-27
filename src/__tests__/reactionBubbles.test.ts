import {
  MAX_BUBBLES,
  ReactionBubble,
  ReactionRestore,
  addBubble,
  bubbleKind,
  makeBubble,
} from '../renderer/shared/utils/reactionBubbles';

describe('bubbleKind', () => {
  it('maps the ephemeral reactions, case-insensitively', () => {
    expect(bubbleKind('HEART')).toBe('heart');
    expect(bubbleKind('like')).toBe('like');
    expect(bubbleKind('Clap')).toBe('clap');
  });

  it('leaves the persistent hand state and unknown content alone', () => {
    expect(bubbleKind('HAND')).toBeUndefined();
    expect(bubbleKind('NONE')).toBeUndefined();
    expect(bubbleKind('WHATEVER')).toBeUndefined();
  });
});

describe('addBubble', () => {
  it('appends while under the cap', () => {
    const one = makeBubble('heart', 'Bạn');
    expect(addBubble([], one)).toEqual([one]);
  });

  it('drops the oldest once the cap is hit', () => {
    let bubbles: ReactionBubble[] = [];
    for (let i = 0; i < MAX_BUBBLES + 5; i += 1) {
      bubbles = addBubble(bubbles, makeBubble('clap', `user-${i}`));
    }
    expect(bubbles).toHaveLength(MAX_BUBBLES);
    expect(bubbles[0].name).toBe('user-5');
    expect(bubbles[bubbles.length - 1].name).toBe(`user-${MAX_BUBBLES + 4}`);
  });
});

describe('ReactionRestore', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores once, 3s after a single reaction', () => {
    const restore = new ReactionRestore();
    const spy = jest.fn();
    restore.schedule(spy);

    jest.advanceTimersByTime(2999);
    expect(spy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('debounces rapid-fire reactions to one restore, from the last one', () => {
    const restore = new ReactionRestore();
    const spy = jest.fn();

    restore.schedule(spy);
    jest.advanceTimersByTime(1500);
    restore.schedule(spy);
    jest.advanceTimersByTime(1500);
    restore.schedule(spy);

    // 3s have passed since the first call, but only 1.5s since the last.
    jest.advanceTimersByTime(1500);
    expect(spy).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1500);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('cancel() drops a pending restore', () => {
    const restore = new ReactionRestore();
    const spy = jest.fn();
    restore.schedule(spy);
    restore.cancel();
    jest.advanceTimersByTime(5000);
    expect(spy).not.toHaveBeenCalled();
  });
});
