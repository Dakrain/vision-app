// const { ScreenCaptureSourceInfo } = window.require('agora-electron-sdk');

import { ScreenCaptureSourceInfo } from 'agora-electron-sdk';
export type ShareScreenDialogProps = {
  open: boolean;
  onClose: () => void;
  onShare: (source:  ScreenCaptureSourceInfo) => void;
  sources: ( ScreenCaptureSourceInfo)[];
};
