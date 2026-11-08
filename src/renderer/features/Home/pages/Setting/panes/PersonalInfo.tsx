import Icon from '@/assets/svg/icons';
import { Avatar } from '@/shared/components';
import UserService, {
  type Country,
  type Prefecture,
} from '@/shared/services/User/UserService';
import { fetchUserInfo } from '@/shared/store/auth/action';
import type { User } from '@/shared/types/user';
import { uploadMedia } from '@/shared/utils/mediaUpload';
import { useAppDispatch } from '@/renderer/store';
import { DatePicker, Select, message as toast } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChangePasswordDialog } from '../ChangePasswordDialog';

interface Form {
  firstName: string;
  lastName: string;
  birthday: number;
  gender: number;
  email: string;
  phoneCode: string;
  phone: string;
  countryId: number;
  prefectureId: number;
  religion: string;
  job: string;
  position: string;
  forte: string;
}

const fromUser = (u: User): Form => {
  // Older accounts only have a full name.
  const [first = '', ...rest] = (u.fullName ?? '').split(' ');
  return {
    firstName: u.firstName ?? first,
    lastName: u.lastName ?? rest.join(' '),
    birthday: u.birthday ?? 0,
    gender: u.gender ?? -1,
    email: u.email ?? '',
    phoneCode: u.phoneCode ?? '',
    phone: u.phone ?? '',
    countryId: u.countryId ?? 0,
    prefectureId: u.prefectureId ?? 0,
    religion: u.religion ?? '',
    job: u.job ?? '',
    position: u.position ?? '',
    forte: u.forte ?? '',
  };
};

/** Accent-insensitive search for the country / city pickers ("viet"). */
const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
const searchLabel = (input: string, option?: { label?: unknown }) =>
  fold(String(option?.label ?? '')).includes(fold(input));

function Field({
  label,
  children,
  extra,
}: {
  label: string;
  children: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="settings-field">
      <div className="settings-field-label">
        <span>{label}</span>
        {extra}
      </div>
      <div className="settings-field-control">{children}</div>
    </div>
  );
}

interface Props {
  user: User;
  /** "Xóa tài khoản" was asked for. */
  onDeleteAccount: () => void;
}

/** "Thông tin cá nhân" (Figma 10946:59797). */
export function PersonalInfo({ user, onDeleteAccount }: Props) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const initial = useMemo(() => fromUser(user), [user]);
  const [form, setForm] = useState<Form>(initial);
  const [saving, setSaving] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<Prefecture[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setForm(initial), [initial]);

  useEffect(() => {
    UserService.fetchCountries()
      .then(setCountries)
      .catch(() => {});
  }, []);

  const country = countries.find((c) => c.id === form.countryId);
  useEffect(() => {
    if (!country) {
      setCities([]);
      return;
    }
    UserService.fetchCities(country.countryCode)
      .then(setCities)
      .catch(() => setCities([]));
  }, [country]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const reload = () => {
    if (user.id) dispatch(fetchUserInfo(String(user.id)));
  };

  const putProfile = (extra: { avatar?: number } = {}) =>
    UserService.updateProfile(user.id!, {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      birthday: form.birthday,
      gender: form.gender,
      phone: form.phone.trim(),
      phoneCode: form.phoneCode,
      countryId: form.countryId || undefined,
      prefectureId: form.prefectureId || undefined,
      religion: form.religion.trim(),
      position: form.position.trim(),
      forte: form.forte.trim(),
      ...extra,
    });

  const save = async () => {
    if (!user.id) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.warning(t('account.personal.name_required'));
      return;
    }
    if (!form.birthday) {
      toast.warning(t('account.personal.birthday_required'));
      return;
    }
    setSaving(true);
    try {
      await putProfile();
      // Job only goes through PATCH (as on mobile).
      await UserService.patchProfile(user.id, { job: form.job.trim() });
      toast.success(t('account.personal.saved'));
      reload();
    } catch (e) {
      let rule = '';
      try {
        const err = JSON.parse(String(e)).response?.data?.errors?.[0];
        rule = err ? `${err.field}:${err.rule}` : '';
      } catch (_) {
        // Not an API error.
      }
      toast.error(
        rule.startsWith('email') || rule.startsWith('phone')
          ? t('account.personal.email_phone_taken')
          : t('account.personal.save_failed'),
      );
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file?: File) => {
    if (!file || !user.id) return;
    const hide = toast.loading(t('account.personal.uploading_avatar'));
    try {
      const media = await uploadMedia(file);
      const saved = await putProfile({ avatar: media.id });
      // A server without avatar support ignores the field: say so instead
      // of claiming success.
      if (Number(saved?.avatar) !== media.id) {
        toast.error(t('account.personal.avatar_unsupported'));
        return;
      }
      toast.success(t('account.personal.avatar_changed'));
      reload();
    } catch (_) {
      toast.error(t('account.personal.avatar_failed'));
    } finally {
      hide();
    }
  };

  const text = (key: keyof Form, placeholder?: string) => (
    <input
      value={form[key] as string}
      placeholder={placeholder}
      onChange={(e) => set(key, e.target.value as never)}
    />
  );

  return (
    <div className="settings-profile">
      <div className="settings-avatar">
        {user.avatarUrl ? (
          <Avatar url={user.avatarUrl} radius={40} name={user.fullName ?? ''} />
        ) : (
          // No photo yet: the design's blue profile placeholder.
          <span className="settings-avatar-placeholder">
            <Icon name="settingProfileBig" />
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            changeAvatar(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()}>
          {t('account.personal.change_avatar')}
        </button>
      </div>

      <div className="settings-form">
        <section>
          <h2>{t('account.personal.title')}</h2>
          <div className="settings-row">
            <Field
              label={t('account.personal.required_field', {
                label: t('shared.form.first_name'),
              })}
            >
              {text('firstName')}
            </Field>
            <Field
              label={t('account.personal.required_field', {
                label: t('shared.form.last_name'),
              })}
            >
              {text('lastName')}
            </Field>
          </div>
          <Field
            label={t('account.personal.required_field', {
              label: t('shared.form.birthday'),
            })}
          >
            <DatePicker
              variant="borderless"
              format="DD / MM / YYYY"
              placeholder={t('auth.register.birthday_hint')}
              value={form.birthday ? dayjs.unix(form.birthday) : null}
              onChange={(d: Dayjs | null) =>
                set('birthday', d ? d.startOf('day').unix() : 0)
              }
              disabledDate={(d) => d.isAfter(dayjs())}
            />
          </Field>
          <Field label={t('account.personal.gender')}>
            <Select
              variant="borderless"
              placeholder={t('account.personal.gender_hint')}
              // Anything but 1/0 (e.g. 2 from registration) is "not chosen".
              value={
                form.gender === 0 || form.gender === 1 ? form.gender : undefined
              }
              onChange={(v) => set('gender', v)}
              options={[
                { value: 1, label: t('account.personal.gender_male') },
                { value: 0, label: t('account.personal.gender_female') },
              ]}
            />
          </Field>
          {/* The sign-in identifier: shown, not edited here. */}
          <Field label={t('shared.form.email')}>
            <input value={form.email} readOnly className="readonly" />
          </Field>
          <Field label={t('shared.form.phone')}>
            <span className="settings-phone">
              {form.phoneCode && <em>(+{form.phoneCode.replace('+', '')})</em>}
              {text('phone')}
            </span>
          </Field>
          <Field label={t('shared.form.country')}>
            <Select
              variant="borderless"
              showSearch
              filterOption={searchLabel}
              placeholder={t('account.personal.country_hint')}
              value={form.countryId || undefined}
              onChange={(v: number) => {
                const c = countries.find((x) => x.id === v);
                setForm((f) => ({
                  ...f,
                  countryId: v,
                  prefectureId: 0,
                  phoneCode: c ? String(c.phoneCode) : f.phoneCode,
                }));
              }}
              options={countries.map((c) => ({
                value: c.id,
                label:
                  c.countryCode === 'vn'
                    ? t('account.personal.vietnam')
                    : c.countryName,
              }))}
            />
          </Field>
          <Field label={t('account.personal.city')}>
            <Select
              variant="borderless"
              showSearch
              filterOption={searchLabel}
              placeholder={t('account.personal.city_hint')}
              disabled={!cities.length}
              value={form.prefectureId || undefined}
              onChange={(v: number) => set('prefectureId', v)}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
        </section>

        <section>
          <h2>{t('home.menu.account')}</h2>
          <Field
            label={t('shared.form.password')}
            extra={
              <button
                type="button"
                className="settings-link"
                onClick={() => setPasswordOpen(true)}
              >
                {t('auth.forgot.change_password')}
              </button>
            }
          >
            <input value="••••••••••••" readOnly tabIndex={-1} />
          </Field>
          <button
            type="button"
            className="settings-link"
            onClick={onDeleteAccount}
          >
            {t('account.delete.title')}
          </button>
        </section>

        <section>
          <h2>{t('account.personal.about_you')}</h2>
          <Field label={t('account.personal.religion')}>
            {text('religion')}
          </Field>
          <Field label={t('account.personal.job')}>{text('job')}</Field>
          <Field label={t('account.personal.position')}>
            {text('position')}
          </Field>
          <Field label={t('account.personal.talent')}>{text('forte')}</Field>
        </section>
      </div>

      {dirty && (
        <div className="settings-savebar">
          <button
            type="button"
            className="settings-text-btn"
            onClick={() => setForm(initial)}
            disabled={saving}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="settings-btn primary"
            onClick={save}
            disabled={saving}
          >
            {t('account.personal.save_changes')}
          </button>
        </div>
      )}

      <ChangePasswordDialog
        open={passwordOpen}
        userId={user.id!}
        onClose={() => setPasswordOpen(false)}
      />
    </div>
  );
}
