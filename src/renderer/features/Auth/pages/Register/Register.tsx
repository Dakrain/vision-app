/* eslint-disable jsx-a11y/label-has-associated-control */
import './Register.scss';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { message } from 'antd';
import Icon from '@/assets/svg/icons';
import authService from '@/renderer/shared/services/Auth/AuthService';
import { GENDER_UNSET } from '@/renderer/shared/services/Auth/request';
import { RegisterFormErrors, validateRegisterForm } from './validation';

const { ipcRenderer } = window.require('electron');

// Mirrors mobile's registration screen
// (lib/presentation/screens/register/pages/account_information.dart):
// same fields, same validation copy, same "Đăng ký thành công" toast, and
// the same "no auto-login, just go back to Login" behavior on success.
function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [apiError, setApiError] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmVisible, setIsConfirmVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Taller than Login's 852px since this form has one more field row.
    ipcRenderer.send('resize-window', { width: 480, height: 940 });
  }, []);

  const handleRegister = async () => {
    const formErrors = validateRegisterForm({
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
    });
    setErrors(formErrors);
    if (Object.keys(formErrors).length > 0) return;

    setApiError('');
    setSubmitting(true);
    try {
      // No gender asked here: 0 would read as "Nữ".
      await authService.register({
        firstName,
        lastName,
        email,
        password,
        gender: GENDER_UNSET,
      });
      message.success(t('auth.register.success'));
      navigate('/login');
    } catch (e) {
      // Same check as mobile's account_information.dart error listener:
      // registering with no phone number also trips the API's "phone" unique
      // constraint (multiple null phones collide), so the email error isn't
      // necessarily errors[0] — scan the whole array like mobile does.
      let isUniqueEmail = false;
      try {
        const apiErrors = JSON.parse(String(e)).response?.data?.errors ?? [];
        isUniqueEmail = apiErrors.some(
          (err: { code?: string; field?: string }) =>
            err.code === 'unique' && err.field === 'email',
        );
      } catch (_) {
        // Not an API error.
      }
      setApiError(
        isUniqueEmail
          ? t('auth.register.email_exists')
          : t('auth.register.error'),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-container">
      <form
        className="register-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          handleRegister();
        }}
      >
        <h1 className="title">{t('auth.register.title')}</h1>

        <div className="name-row">
          <div className="form-group">
            <label htmlFor="firstName">{t('shared.form.first_name')}</label>
            <input
              id="firstName"
              placeholder={t('shared.form.first_name')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            {errors.firstName && (
              <div className="field-error">{errors.firstName}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="lastName">{t('shared.form.last_name')}</label>
            <input
              id="lastName"
              placeholder={t('shared.form.last_name')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            {errors.lastName && (
              <div className="field-error">{errors.lastName}</div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">{t('shared.form.email')}</label>
          <input
            type="email"
            id="email"
            placeholder={t('shared.form.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>

        <div className="form-group">
          <label htmlFor="password">{t('shared.form.password')}</label>
          <div className="password-input">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              id="password"
              placeholder={t('shared.form.password')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              // Figma only has the slashed eye: lit up while the text shows.
              className={`toggle-password${isPasswordVisible ? ' visible' : ''}`}
              aria-label={
                isPasswordVisible
                  ? t('auth.login.hide_password')
                  : t('auth.login.show_password')
              }
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              <Icon name="eyeSlash" />
            </button>
          </div>
          {errors.password && (
            <div className="field-error">{errors.password}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">
            {t('auth.register.confirm_password')}
          </label>
          <div className="password-input">
            <input
              type={isConfirmVisible ? 'text' : 'password'}
              id="confirmPassword"
              placeholder={t('auth.register.confirm_password')}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              // Figma only has the slashed eye: lit up while the text shows.
              className={`toggle-password${isConfirmVisible ? ' visible' : ''}`}
              aria-label={
                isConfirmVisible
                  ? t('auth.login.hide_password')
                  : t('auth.login.show_password')
              }
              aria-pressed={isConfirmVisible}
              onClick={() => setIsConfirmVisible(!isConfirmVisible)}
            >
              <Icon name="eyeSlash" />
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="field-error">{errors.confirmPassword}</div>
          )}
        </div>

        {apiError && <div className="error">{apiError}</div>}

        <div className="register-footer">
          <button
            type="submit"
            className="sign-up-button"
            disabled={submitting}
          >
            {t('auth.register.submit')}
          </button>

          <p className="terms">
            {/* No terms pages exist yet (these linked to google.com). */}
            {t('auth.register.terms_prefix')}
            <b>{t('auth.login.terms_of_service')}</b>,{' '}
            <b>{t('auth.login.privacy_cookie')}</b>
          </p>

          <div className="login-prompt">
            {t('auth.register.have_account_question')}{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/login')}
            >
              {t('auth.login.title')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Register;
