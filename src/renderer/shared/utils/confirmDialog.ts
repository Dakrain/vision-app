import { Modal, ModalFuncProps } from 'antd';

/**
 * A confirm dialog with the close (X) every window has; Modal.confirm
 * has none by default. Its look comes from the app's dialog theme.
 */
export const confirmDialog = (props: ModalFuncProps) =>
  Modal.confirm({ closable: true, ...props });
