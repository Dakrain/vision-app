const { ScreenCaptureSourceInfo } = window.require('agora-electron-sdk');

export type ShareScreenDialogProps = {
  open: boolean;
  onClose: () => void;
  onShare: (source: typeof ScreenCaptureSourceInfo) => void;
  sources: (typeof ScreenCaptureSourceInfo)[];
};
