// Mirrors mobile's field validators 1:1
// (lib/presentation/screens/register/pages/account_information.dart +
// lib/core/utils/validation_utils.dart), including the exact Vietnamese
// error copy, so desktop registration behaves the same as mobile's.

import i18n from '@/renderer/i18n';

// Same regex as ValidationUtils.isValidEmail on mobile.
export const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

export function validateFirstName(value: string): string | null {
  return value ? null : i18n.t('shared.validation.first_name_required');
}

export function validateLastName(value: string): string | null {
  return value ? null : i18n.t('shared.validation.last_name_required');
}

export function validateEmail(value: string): string | null {
  if (!value) return i18n.t('shared.validation.email_required');
  if (!EMAIL_REGEX.test(value))
    return i18n.t('shared.validation.email_invalid');
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value) return i18n.t('shared.validation.password_required');
  if (value.length < 6) return i18n.t('shared.validation.password_min_length');
  return null;
}

export function validateConfirmPassword(
  value: string,
  password: string,
): string | null {
  if (!value) return i18n.t('shared.validation.confirm_password_required');
  return value === password
    ? null
    : i18n.t('shared.validation.password_mismatch');
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
