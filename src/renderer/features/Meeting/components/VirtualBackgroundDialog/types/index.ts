export type VirtualBackground = {
  id: string;
  type: string;
  src: string;
  name: string;
  filePath: string;
  /** Added by the user (can be deleted). */
  custom?: boolean;
};

export type VirtualBackgroundProps = {
  open: boolean;
  onClose: () => void;
};
