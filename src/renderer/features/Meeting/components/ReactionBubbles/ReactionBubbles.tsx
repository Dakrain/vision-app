import Icon from '@/assets/svg/icons';
import './ReactionBubbles.scss';
import { ReactionBubblesProps } from './types';

/**
 * Heart/Like/Clap float up from the lower-right of the stage and fade out,
 * Teams style, on every client (sender included) — see useMeeting's
 * sendReaction/handleReaction for where `bubbles` comes from. Purely a CSS
 * animation (transform/opacity): a bubble removes itself via its own
 * `onAnimationEnd`, no JS timer. `pointer-events: none` keeps it from
 * blocking clicks on the tiles/controls underneath.
 */
export function ReactionBubbles({
  bubbles,
  onBubbleDone,
}: ReactionBubblesProps) {
  if (bubbles.length === 0) return null;
  return (
    <div className="reaction-bubbles">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className={`reaction-bubble reaction-bubble-drift-${bubble.drift}`}
          style={{ left: `${bubble.left}%` }}
          onAnimationEnd={() => onBubbleDone(bubble.id)}
        >
          <Icon name={bubble.kind} className="reaction-bubble-icon" />
          <span className="reaction-bubble-name">{bubble.name}</span>
        </div>
      ))}
    </div>
  );
}
