import {
  validateRegisterForm,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from '../renderer/features/Auth/pages/Register/validation';

describe('register validation (mirrors mobile account_information.dart)', () => {
  it('passes with a fully valid form', () => {
    expect(
      validateRegisterForm({
        firstName: 'Nguyen',
        lastName: 'Van A',
        email: 'a@example.com',
        password: '123456',
        confirmPassword: '123456',
      }),
    ).toEqual({});
  });

  it('requires first and last name', () => {
    const errors = validateRegisterForm({
      firstName: '',
      lastName: '',
      email: 'a@example.com',
      password: '123456',
      confirmPassword: '123456',
    });
    expect(errors.firstName).toBe('Họ không được để trống');
    expect(errors.lastName).toBe('Tên không được để trống');
  });

  it('rejects an invalid email format', () => {
    expect(validateEmail('not-an-email')).toBe('Email không hợp lệ');
    expect(validateEmail('')).toBe('Email không được để trống');
    expect(validateEmail('a@example.com')).toBeNull();
  });

  it('requires a password of at least 6 characters', () => {
    expect(validatePassword('')).toBe('Mật khẩu không được để trống');
    expect(validatePassword('123')).toBe('Mật khẩu phải có ít nhất 6 ký tự');
    expect(validatePassword('123456')).toBeNull();
  });

  it('requires the confirmation to match the password', () => {
    expect(validateConfirmPassword('abcdef', '123456')).toBe(
      'Mật khẩu không khớp',
    );
    expect(validateConfirmPassword('123456', '123456')).toBeNull();
    expect(validateConfirmPassword('', '')).toBe('Vui lòng nhập lại mật khẩu');
  });
});
