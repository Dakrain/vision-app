import UserService from '@/shared/services/User/UserService';
import { deleteAccount } from '@/shared/utils/deleteAccount';
import { Modal } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Setting.scss';

interface Props {
  open: boolean;
  onCancel: () => void;
  /** The account is gone: leave for the login screen. */
  onDeleted: () => void;
}

/** "Xóa tài khoản?": deletes it for good, then signs out. */
export function DeleteAccountDialog({ open, onCancel, onDeleted }: Props) {
  const { t } = useTranslation();
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (open) setFailed(false);
  }, [open]);

  const confirm = async () => {
    setDeleting(true);
    setFailed(false);
    const ok = await deleteAccount({
      withdraw: () => UserService.withdraw(),
      signOut: onDeleted,
    });
    setDeleting(false);
    if (!ok) setFailed(true);
  };

  return (
    <Modal
      open={open}
      onCancel={deleting ? undefined : onCancel}
      centered
      width={420}
      title={null}
      footer={null}
      closable={false}
      className="settings-dialog"
    >
      <div className="settings-confirm">
        <h3>{t('account.delete.title')}</h3>
        <p>{t('account.delete.message')}</p>
        {failed && (
          <p className="settings-error">{t('account.delete.failed')}</p>
        )}
        <div className="settings-confirm-actions">
          <button
            type="button"
            className="settings-text-btn"
            onClick={onCancel}
            disabled={deleting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="settings-btn primary"
            onClick={confirm}
            disabled={deleting}
          >
            {t('account.delete.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
