export interface Emoji {
    label: string;
    value: string;
  }
  
export interface EmojiPickerProps {
    open: boolean;
    onClose: () => void;
    onEmojiSelect: (emoji: string) => void;
    children: React.ReactNode;
  }