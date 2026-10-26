/* eslint-disable jsx-a11y/label-has-associated-control */
import './Register.scss';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { message } from 'antd';
import Icon from '@/assets/svg/icons';
import authService from '@/renderer/shared/services/Auth/AuthService';
import { RegisterFormErrors, validateRegisterForm } from './validation';

const { ipcRenderer } = window.require('electron');

// Mirrors mobile's registration screen
// (lib/presentation/screens/register/pages/account_information.dart):
// same fields, same validation copy, same "Đăng ký thành công" toast, and
// the same "no auto-login, just go back to Login" behavior on success.
function Register() {
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
      await authService.register({ firstName, lastName, email, password });
      message.success('Đăng ký thành công');
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
      setApiError(isUniqueEmail ? 'Email đã tồn tại' : 'Đã có lỗi xảy ra');
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
        <h1 className="title">Tạo mới tài khoản</h1>

        <div className="name-row">
          <div className="form-group">
            <label htmlFor="firstName">Họ</label>
            <input
              id="firstName"
              placeholder="Họ"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            {errors.firstName && (
              <div className="field-error">{errors.firstName}</div>
            )}
          </div>
          <div className="form-group">
            <label htmlFor="lastName">Tên</label>
            <input
              id="lastName"
              placeholder="Tên"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            {errors.lastName && (
              <div className="field-error">{errors.lastName}</div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <div className="field-error">{errors.email}</div>}
        </div>

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
              aria-label="Hiện/ẩn mật khẩu"
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
          <label htmlFor="confirmPassword">Nhập lại mật khẩu</label>
          <div className="password-input">
            <input
              type={isConfirmVisible ? 'text' : 'password'}
              id="confirmPassword"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button
              type="button"
              className="toggle-password"
              aria-label="Hiện/ẩn mật khẩu"
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
            Đăng ký
          </button>

          <p className="terms">
            Bằng việc đăng ký, bạn đồng ý với{' '}
            <a href="https://google.com">Điều khoản dịch vụ</a>,{' '}
            <a href="https://google.com">Chính sách bảo mật và Cookie</a>
          </p>

          <div className="login-prompt">
            Bạn đã có tài khoản?{' '}
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/login')}
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default Register;
