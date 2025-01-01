/* eslint-disable jsx-a11y/label-has-associated-control */
import './Login.scss';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import appLogo from 'assets/images/app_logo.png';
import { useAppSelector } from '@/renderer/store/hooks';
import useLoading from '@/renderer/shared/hooks/useLoading';
import { message } from 'antd';
import { useAuth } from '@/renderer/shared/hooks/useAuth';
import { login } from '../../../../shared/store/auth/action';
import { selectIsAuth } from '../../../../shared/store/auth/selector';

const { ipcRenderer } = window.require('electron');

const isDev = process.env.NODE_ENV === 'development';

function Login() {
  const { dispatchWithLoading } = useLoading();
  const navigate = useNavigate();
  const isAuth = useAppSelector(selectIsAuth);
  const [email, setEmail] = useState(isDev ? 'visiontester@gmail.com' : '');
  const [password, setPassword] = useState(isDev ? '123456' : '');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { error } = useAuth();
  useEffect(() => {
    ipcRenderer.send('resize-window', { width: 480, height: 852 });
    if (isAuth) {
      navigate('/home');
    }
  }, [isAuth, navigate]);

  const handleLogin = () => {
    if (!email || !password) {
      message.error('Vui lòng nhập đầy đủ thông tin');
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
        <h1 className="title">Đăng nhập</h1>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && <div className="error">{error.message}</div>}
        <div className="form-group">
          <label htmlFor="password">Mật khẩu</label>
          <div className="password-input">
            <input
              type={isPasswordVisible ? 'text' : 'password'}
              id="password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              aria-label="Toggle password visibility"
              onClick={() => setIsPasswordVisible(!isPasswordVisible)}
            >
              <i className="eye-icon" />
            </button>
          </div>
          <a href="https://google.com" className="forgot-password">
            Quên mật khẩu?
          </a>
        </div>
      </div>
      <div className="login-footer">
        <button
          type="button"
          className="sign-in-button"
          onClick={handleLogin}
          disabled={!email || !password}
        >
          Đăng nhập
        </button>

        <p className="terms">
          Bằng việc đăng nhập, bạn đồng ý với{' '}
          <a href="https://google.com">Điều khoản dịch vụ</a>,{' '}
          <a href="https://google.com">Chính sách bảo mật và Cookie</a>
        </p>

        <div className="register-prompt">
          Bạn không có tài khoản?{' '}
          <a href="https://vision20.us/register">Đăng ký</a>
        </div>
      </div>
    </div>
  );
}

export default Login;
