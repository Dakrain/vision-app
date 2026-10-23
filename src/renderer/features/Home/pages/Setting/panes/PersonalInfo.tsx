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
}

/** "Thông tin cá nhân" (Figma 10946:59797). */
export function PersonalInfo({ user }: Props) {
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
      toast.warning('Vui lòng nhập đủ Họ và Tên');
      return;
    }
    if (!form.birthday) {
      toast.warning('Vui lòng chọn ngày sinh');
      return;
    }
    setSaving(true);
    try {
      await putProfile();
      // Job only goes through PATCH (as on mobile).
      await UserService.patchProfile(user.id, { job: form.job.trim() });
      toast.success('Đã lưu thông tin cá nhân');
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
          ? 'Email hoặc số điện thoại đã được dùng cho tài khoản khác'
          : 'Không lưu được thông tin, vui lòng thử lại',
      );
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file?: File) => {
    if (!file || !user.id) return;
    const hide = toast.loading('Đang tải ảnh lên…');
    try {
      const media = await uploadMedia(file);
      await putProfile({ avatar: media.id });
      toast.success('Đã đổi ảnh đại diện');
      reload();
    } catch (_) {
      toast.error('Không đổi được ảnh đại diện');
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
        <Avatar
          url={user.avatarUrl ?? ''}
          radius={40}
          name={user.fullName ?? ''}
        />
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
          Thay đổi
        </button>
      </div>

      <div className="settings-form">
        <section>
          <h2>Thông tin cá nhân</h2>
          <div className="settings-row">
            <Field label="Họ">{text('firstName')}</Field>
            <Field label="Tên">{text('lastName')}</Field>
          </div>
          <Field label="Ngày sinh">
            <DatePicker
              variant="borderless"
              format="DD / MM / YYYY"
              placeholder="Chọn ngày sinh"
              value={form.birthday ? dayjs.unix(form.birthday) : null}
              onChange={(d: Dayjs | null) =>
                set('birthday', d ? d.startOf('day').unix() : 0)
              }
              disabledDate={(d) => d.isAfter(dayjs())}
            />
          </Field>
          <Field label="Giới tính">
            <Select
              variant="borderless"
              placeholder="Chọn giới tính"
              value={form.gender >= 0 ? form.gender : undefined}
              onChange={(v) => set('gender', v)}
              options={[
                { value: 1, label: 'Nam' },
                { value: 0, label: 'Nữ' },
              ]}
            />
          </Field>
          <Field label="Email">{text('email')}</Field>
          <Field label="Số điện thoại">
            <span className="settings-phone">
              {form.phoneCode && <em>(+{form.phoneCode.replace('+', '')})</em>}
              {text('phone')}
            </span>
          </Field>
          <Field label="Quốc gia">
            <Select
              variant="borderless"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn quốc gia"
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
                label: c.countryCode === 'vn' ? 'Việt Nam' : c.countryName,
              }))}
            />
          </Field>
          <Field label="Thành phố">
            <Select
              variant="borderless"
              showSearch
              optionFilterProp="label"
              placeholder="Chọn thành phố"
              disabled={!cities.length}
              value={form.prefectureId || undefined}
              onChange={(v: number) => set('prefectureId', v)}
              options={cities.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
        </section>

        <section>
          <h2>Tài khoản</h2>
          <Field
            label="Mật khẩu"
            extra={
              <button
                type="button"
                className="settings-link"
                onClick={() => setPasswordOpen(true)}
              >
                Đổi mật khẩu
              </button>
            }
          >
            <input value="••••••••••••" readOnly tabIndex={-1} />
          </Field>
        </section>

        <section>
          <h2>Thông tin về bạn</h2>
          <Field label="Tôn giáo của bạn">{text('religion')}</Field>
          <Field label="Nghề nghiệp của bạn">{text('job')}</Field>
          <Field label="Chức vụ của bạn">{text('position')}</Field>
          <Field label="Tài năng của bạn">{text('forte')}</Field>
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
            Hủy
          </button>
          <button
            type="button"
            className="settings-btn primary"
            onClick={save}
            disabled={saving}
          >
            Lưu thay đổi
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
