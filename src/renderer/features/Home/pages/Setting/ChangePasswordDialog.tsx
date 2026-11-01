import Icon from '@/assets/svg/icons';
import UserService from '@/shared/services/User/UserService';
import { Modal, message as toast } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  userId: number;
  onClose: () => void;
}

/** "Thay đổi mật khẩu của bạn" (Figma 10946:60062). */
export function ChangePasswordDialog({ open, userId, onClose }: Props) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
  };

  const submit = async () => {
    setError('');
    if (next.length < 6 || next.length > 20) {
      setError(t('account.change_password.length'));
      return;
    }
    if (next !== confirm) {
      setError(t('account.change_password.mismatch'));
      return;
    }
    setSaving(true);
    try {
      await UserService.changePassword(userId, {
        currentPassword: current,
        password: next,
        confirmPassword: confirm,
      });
      toast.success(t('account.change_password.success'));
      onClose();
    } catch (e) {
      let rule = '';
      try {
        rule = JSON.parse(String(e)).response?.data?.errors?.[0]?.rule ?? '';
      } catch (_) {
        // Not an API error.
      }
      setError(
        rule === 'wrong_password'
          ? t('account.change_password.wrong_current')
          : t('account.change_password.failed'),
      );
    } finally {
      setSaving(false);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <label className="settings-pw-field" htmlFor={id}>
      <span>{label}</span>
      <input
        id={id}
        type="password"
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterClose={reset}
      centered
      width={446}
      title={null}
      footer={null}
      closable={false}
      className="settings-dialog"
    >
      <form
        className="settings-pw"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="settings-pw-header">
          <h2>{t('account.change_password.title')}</h2>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            <Icon name="meetingClose" />
          </button>
        </div>
        <p className="settings-pw-desc">
          {t('account.change_password.description')}
        </p>
        {field(
          'pw-current',
          t('account.change_password.current'),
          current,
          setCurrent,
        )}
        {field('pw-new', t('auth.reset.new_password'), next, setNext)}
        {field(
          'pw-confirm',
          t('account.change_password.confirm_new'),
          confirm,
          setConfirm,
        )}
        {error && <div className="settings-error">{error}</div>}
        <button
          type="submit"
          className="settings-btn primary block"
          disabled={!current || !next || !confirm || saving}
        >
          {t('account.change_password.submit')}
        </button>
      </form>
    </Modal>
  );
}
