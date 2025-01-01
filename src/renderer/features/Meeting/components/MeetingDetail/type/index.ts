import { Room } from '@/renderer/shared/types/meeting';

export interface MeetingDetailProps {
  isOpen: boolean;
  onClose: () => void;
  meetingInfo: Room;
}

export interface InfoItemProps {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy: (text: string) => void;
}
