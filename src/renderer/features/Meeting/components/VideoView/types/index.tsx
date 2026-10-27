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
  /** Local tile only: render the screen-capture source instead of the camera. */
  isSharing?: boolean;
  /** No name tag (a shared screen: it would cover the content). */
  hideLabel?: boolean;
}
