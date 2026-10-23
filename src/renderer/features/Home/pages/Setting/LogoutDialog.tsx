import { Modal } from 'antd';
import './Setting.scss';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** "Bạn có chắc chắn muốn đăng xuất không?" */
export function LogoutDialog({ open, onCancel, onConfirm }: Props) {
  return (
    <Modal
      open={open}
      onCancel={onCancel}
      centered
      width={420}
      title={null}
      footer={null}
      closable={false}
      className="settings-dialog"
    >
      <div className="settings-confirm">
        <p>Bạn có chắc chắn muốn đăng xuất không?</p>
        <div className="settings-confirm-actions">
          <button
            type="button"
            className="settings-text-btn"
            onClick={onCancel}
          >
            Hủy
          </button>
          <button
            type="button"
            className="settings-btn primary"
            onClick={onConfirm}
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </Modal>
  );
}
