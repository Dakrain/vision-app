import authService from '@/renderer/shared/services/Auth/AuthService';
import { Input, Modal, notification } from 'antd';
import { useState } from 'react';
import { EMAIL_REGEX } from '../Register/validation';

type Step = 'email' | 'code' | 'password';

type Props = {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
};

/**
 * "Quên mật khẩu?": email → the 6-digit code mailed to it → a new password
 * (the same three API calls as mobile).
 */
export function ForgotPasswordDialog({ open, initialEmail, onClose }: Props) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [reset, setReset] = useState<{ id: number; token: string }>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const close = () => {
    setStep('email');
    setCode('');
    setPassword('');
    setConfirm('');
    setReset(undefined);
    setError(undefined);
    onClose();
  };

  const run = async (action: () => Promise<void>, failure: string) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
    } catch (_) {
      setError(failure);
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 'email') {
      const value = email.trim();
      if (!EMAIL_REGEX.test(value)) {
        setError('Email không hợp lệ');
        return;
      }
      run(async () => {
        await authService.forgotPassword(value);
        setStep('code');
      }, 'Không tìm thấy tài khoản với email này');
    } else if (step === 'code') {
      if (!/^\d{6}$/.test(code.trim())) {
        setError('Mã xác nhận gồm 6 chữ số');
        return;
      }
      run(async () => {
        setReset(await authService.verifyResetCode(email.trim(), code.trim()));
        setStep('password');
      }, 'Mã xác nhận không đúng hoặc đã hết hạn');
    } else {
      if (password.length < 6 || password.length > 20) {
        setError('Mật khẩu từ 6 đến 20 ký tự');
        return;
      }
      if (password !== confirm) {
        setError('Mật khẩu không khớp');
        return;
      }
      run(async () => {
        await authService.resetPassword({
          id: reset!.id,
          token: reset!.token,
          password,
          confirmPassword: confirm,
        });
        notification.success({
          message: 'Đã đổi mật khẩu, mời bạn đăng nhập lại',
          placement: 'top',
        });
        close();
      }, 'Không đổi được mật khẩu, vui lòng thử lại');
    }
  };

  const titles: Record<Step, string> = {
    email: 'Quên mật khẩu',
    code: 'Nhập mã xác nhận',
    password: 'Đặt mật khẩu mới',
  };

  return (
    <Modal
      open={open}
      title={titles[step]}
      okText={step === 'password' ? 'Đổi mật khẩu' : 'Tiếp tục'}
      cancelText="Hủy"
      confirmLoading={busy}
      onOk={next}
      onCancel={close}
      centered
      destroyOnClose
    >
      {step === 'email' && (
        <>
          <p>Nhập email tài khoản để nhận mã xác nhận.</p>
          <Input
            autoFocus
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={next}
          />
        </>
      )}
      {step === 'code' && (
        <>
          <p>Mã gồm 6 chữ số đã được gửi tới {email.trim()}.</p>
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            placeholder="Mã xác nhận"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onPressEnter={next}
          />
        </>
      )}
      {step === 'password' && (
        <>
          <Input.Password
            autoFocus
            placeholder="Mật khẩu mới"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input.Password
            style={{ marginTop: 12 }}
            placeholder="Nhập lại mật khẩu"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onPressEnter={next}
          />
        </>
      )}
      {error && <div className="forgot-password-error">{error}</div>}
    </Modal>
  );
}
