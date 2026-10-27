export interface Emoji {
    label: string;
    value: string;
  }
  
export interface EmojiPickerProps {
    open: boolean;
    onClose: () => void;
    onEmojiSelect: (emoji: string) => void;
    children: React.ReactNode;
  /** Highlights the hand button; its tooltip flips Giơ tay/Hạ tay. */
  handRaised?: boolean;
  }