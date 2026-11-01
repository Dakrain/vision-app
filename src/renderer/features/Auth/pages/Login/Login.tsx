/* eslint-disable jsx-a11y/label-has-associated-control */
import './Login.scss';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import appLogo from 'assets/images/app_logo.png';
import { useAppSelector } from '@/renderer/store/hooks';
import useLoading from '@/renderer/shared/hooks/useLoading';
import { message } from 'antd';
import { useAuth } from '@/renderer/shared/hooks/useAuth';
import Icon from '@/assets/svg/icons';
import { login } from '../../../../shared/store/auth/action';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { selectIsAuth } from '../../../../shared/store/auth/selector';

const { ipcRenderer } = window.require('electron');

const isDev = process.env.NODE_ENV === 'development';

function Login() {
  const { t } = useTranslation();
  const { dispatchWithLoading } = useLoading();
  const navigate = useNavigate();
  const isAuth = useAppSelector(selectIsAuth);
  const [email, setEmail] = useState(isDev ? 'hai2@gmail.com' : '');
  const [password, setPassword] = useState(isDev ? '12345678' : '');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const { error } = useAuth();
  useEffect(() => {
    ipcRenderer.send('resize-window', { width: 480, height: 852 });
    if (isAuth) {
      navigate('/home');
    }
  }, [isAuth, navigate]);

  const handleLogin = () => {
    if (!email || !password) {
      message.error(t('auth.login.fill_all'));
      return;
    }
    dispatchWithLoading(
      login({
        email,
        password,
      }),
    );
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <img src={appLogo} alt="Vision Logo" className="logo" />
        <h1 className="title">{t('auth.login.title')}</h1>
        <div className="form-group">
          <label htmlFor="email">{t('shared.form.email')}</label>
          <input
            type="email"
            id="email"
            placeholder={t('shared.form.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
              // Same as Register: Figma only has the slashed eye, lit up
              // while the text shows (the old <i> had no icon at all).
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
          {/* Under the pair it is about, not between the two fields. */}
          {error && (
            <div className="error">
              {error.code === '422'
                ? t('auth.login.wrong_credentials')
                : t('auth.error_try_later')}
            </div>
          )}
          <button
            type="button"
            className="forgot-password"
            onClick={() => setForgotOpen(true)}
          >
            {t('auth.login.forgot_password_question')}
          </button>
        </div>
      </div>
      <div className="login-footer">
        <button
          type="button"
          className="sign-in-button"
          onClick={handleLogin}
          disabled={!email || !password}
        >
          {t('auth.login.title')}
        </button>

        <p className="terms">
          {/* No terms pages exist yet (these linked to google.com, which
              replaced the whole app window). */}
          {t('auth.login.terms_prefix')}
          <b>{t('auth.login.terms_of_service')}</b>,{' '}
          <b>{t('auth.login.privacy_cookie')}</b>
        </p>

        <div className="register-prompt">
          {t('auth.login.no_account_question')}{' '}
          <button
            type="button"
            className="link-button"
            onClick={() => navigate('/register')}
          >
            {t('auth.register.submit')}
          </button>
        </div>
      </div>
      <ForgotPasswordDialog
        open={forgotOpen}
        initialEmail={email}
        onClose={() => setForgotOpen(false)}
      />
    </div>
  );
}

export default Login;
