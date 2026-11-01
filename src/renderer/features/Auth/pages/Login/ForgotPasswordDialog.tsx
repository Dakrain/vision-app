import authService from '@/renderer/shared/services/Auth/AuthService';
import { Input, Modal, notification } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        setError(t('shared.validation.email_invalid'));
        return;
      }
      run(async () => {
        await authService.forgotPassword(value);
        setStep('code');
      }, t('auth.forgot.email_not_found'));
    } else if (step === 'code') {
      if (!/^\d{6}$/.test(code.trim())) {
        setError(t('auth.forgot.code_format'));
        return;
      }
      run(async () => {
        setReset(await authService.verifyResetCode(email.trim(), code.trim()));
        setStep('password');
      }, t('auth.forgot.code_invalid'));
    } else {
      if (password.length < 6 || password.length > 20) {
        setError(t('auth.forgot.password_length'));
        return;
      }
      if (password !== confirm) {
        setError(t('shared.validation.password_mismatch'));
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
          message: t('auth.forgot.changed'),
          placement: 'top',
        });
        close();
      }, t('auth.forgot.change_failed'));
    }
  };

  const titles: Record<Step, string> = {
    email: t('auth.forgot.title'),
    code: t('auth.forgot.code_title'),
    password: t('auth.forgot.password_title'),
  };

  return (
    <Modal
      open={open}
      title={titles[step]}
      okText={
        step === 'password'
          ? t('auth.forgot.change_password')
          : t('auth.otp.continue')
      }
      cancelText={t('common.cancel')}
      confirmLoading={busy}
      onOk={next}
      onCancel={close}
      centered
      destroyOnClose
    >
      {step === 'email' && (
        <>
          <p>{t('auth.forgot.email_description')}</p>
          <Input
            autoFocus
            type="email"
            placeholder={t('shared.form.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={next}
          />
        </>
      )}
      {step === 'code' && (
        <>
          <p>{t('auth.forgot.code_sent', { email: email.trim() })}</p>
          <Input
            autoFocus
            inputMode="numeric"
            maxLength={6}
            placeholder={t('auth.forgot.code_placeholder')}
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
            placeholder={t('auth.reset.new_password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input.Password
            style={{ marginTop: 12 }}
            placeholder={t('auth.register.confirm_password')}
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
