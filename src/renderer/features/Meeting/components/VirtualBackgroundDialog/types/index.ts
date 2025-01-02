export type VirtualBackground = {
  id: string;
  type: string;
  src: string;
  name: string;
  filePath: string;
};

export type VirtualBackgroundProps = {
  open: boolean;
  onClose: () => void;
};
