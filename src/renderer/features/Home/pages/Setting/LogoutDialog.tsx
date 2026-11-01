import { Modal } from 'antd';
import { useTranslation } from 'react-i18next';
import './Setting.scss';

interface Props {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** "Bạn có chắc chắn muốn đăng xuất không?" */
export function LogoutDialog({ open, onCancel, onConfirm }: Props) {
  const { t } = useTranslation();
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
        <p>{t('account.logout.confirm_message')}</p>
        <div className="settings-confirm-actions">
          <button
            type="button"
            className="settings-text-btn"
            onClick={onCancel}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="settings-btn primary"
            onClick={onConfirm}
          >
            {t('account.tab.logout')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
