import { CSSProperties } from 'react';

export interface VideoViewProps {
  className?: string;
  uid: number;
  enableAudio: boolean;
  enableVideo: boolean;
  label: string;
  avatar: string;
  isLocal: boolean;
  debug?: boolean;
  style?: CSSProperties;
  reaction?: string;
}
