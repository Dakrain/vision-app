import { ReactionBubble } from '@/renderer/shared/utils/reactionBubbles';

export interface ReactionBubblesProps {
  bubbles: ReactionBubble[];
  onBubbleDone: (id: string) => void;
}
