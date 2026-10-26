// Mirrors mobile's field validators 1:1
// (lib/presentation/screens/register/pages/account_information.dart +
// lib/core/utils/validation_utils.dart), including the exact Vietnamese
// error copy, so desktop registration behaves the same as mobile's.

// Same regex as ValidationUtils.isValidEmail on mobile.
export const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export function validateFirstName(value: string): string | null {
  return value ? null : 'Họ không được để trống';
}

export function validateLastName(value: string): string | null {
  return value ? null : 'Tên không được để trống';
}

export function validateEmail(value: string): string | null {
  if (!value) return 'Email không được để trống';
  if (!EMAIL_REGEX.test(value)) return 'Email không hợp lệ';
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return 'Mật khẩu không được để trống';
  if (value.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';
  return null;
}

export function validateConfirmPassword(
  value: string,
  password: string,
): string | null {
  return value === password ? null : 'Mật khẩu không khớp';
}

export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

/** Runs every field validator; returns an empty object when the form is valid. */
export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  const firstName = validateFirstName(values.firstName);
  const lastName = validateLastName(values.lastName);
  const email = validateEmail(values.email);
  const password = validatePassword(values.password);
  const confirmPassword = validateConfirmPassword(
    values.confirmPassword,
    values.password,
  );
  if (firstName) errors.firstName = firstName;
  if (lastName) errors.lastName = lastName;
  if (email) errors.email = email;
  if (password) errors.password = password;
  if (confirmPassword) errors.confirmPassword = confirmPassword;
  return errors;
}
