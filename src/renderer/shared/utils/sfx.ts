/**
 * Short interface sounds, synthesized with Web Audio (no asset). Same pop
 * as mobile: a soft ~0.1 s blip gliding down, quick decay.
 */
let ctx: AudioContext | undefined;
let lastPop = 0;

/** A message came in to the conversation on screen. A burst plays once. */
export function playMessagePop() {
  const now = Date.now();
  if (now - lastPop < 800) return;
  lastPop = now;
  try {
    ctx = ctx ?? new AudioContext();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1150, t);
    osc.frequency.linearRampToValueAtTime(650, t + 0.11);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  } catch (_) {
    // No audio output: nothing to play.
  }
}
