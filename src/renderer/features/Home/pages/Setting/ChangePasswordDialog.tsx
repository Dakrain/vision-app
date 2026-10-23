import Icon from '@/assets/svg/icons';
import UserService from '@/shared/services/User/UserService';
import { Modal, message as toast } from 'antd';
import { useState } from 'react';

interface Props {
  open: boolean;
  userId: number;
  onClose: () => void;
}

/** "Thay đổi mật khẩu của bạn" (Figma 10946:60062). */
export function ChangePasswordDialog({ open, userId, onClose }: Props) {
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
      setError('Mật khẩu mới phải từ 6 đến 20 ký tự');
      return;
    }
    if (next !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    setSaving(true);
    try {
      await UserService.changePassword(userId, {
        currentPassword: current,
        password: next,
        confirmPassword: confirm,
      });
      toast.success('Đã cập nhật mật khẩu');
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
          ? 'Mật khẩu hiện tại không đúng'
          : 'Không cập nhật được mật khẩu, vui lòng thử lại',
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
          <h2>Thay đổi mật khẩu của bạn</h2>
          <button type="button" aria-label="Đóng" onClick={onClose}>
            <Icon name="meetingClose" />
          </button>
        </div>
        <p className="settings-pw-desc">
          Để thay đổi mật khẩu của bạn, vui lòng nhập mật khẩu hiện tại. Sau đó,
          bạn nhập mật khẩu mới và xác nhận lại lần nữa.
        </p>
        {field('pw-current', 'Mật khẩu hiện tại', current, setCurrent)}
        {field('pw-new', 'Mật khẩu mới', next, setNext)}
        {field('pw-confirm', 'Nhập lại mật khẩu mới', confirm, setConfirm)}
        {error && <div className="settings-error">{error}</div>}
        <button
          type="submit"
          className="settings-btn primary block"
          disabled={!current || !next || !confirm || saving}
        >
          Cập nhật mật khẩu
        </button>
      </form>
    </Modal>
  );
}
