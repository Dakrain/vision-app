import Icon from '@/assets/svg/icons';
import { MeetingRole } from '@/shared/types/meeting';
import type { User } from '@/shared/types/user';
import {
  formatFreeSpace,
  getRecordingFolder,
  markAutoRecord,
  setRecordingFolder,
} from '@/shared/utils/recordingPrefs';
import {
  DatePicker,
  InputNumber,
  Modal,
  notification,
  Switch,
  TimePicker,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { type ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useLoading from '../../hooks/useLoading';
import { MeetingService } from '../../services/Meeting';
import { UserPicker } from './UserPicker';
import './CreateMeetingDialog.scss';

const { ipcRenderer } = window.require('electron');

interface Props {
  open: boolean;
  onClose: () => void;
  /** Opened from "Schedule": a start time is required. */
  schedule?: boolean;
  /** A meeting was scheduled for later (it is not joined now). */
  onScheduled?: () => void;
}

type SetupTab = 'info' | 'settings';

/** Picked date + time as unix seconds, or undefined for "now". */
const pickedStartTime = (date: Dayjs | null, time: Dayjs | null) => {
  if (!date && !time) return undefined;
  const day = date ?? time!;
  const at = time ?? date!;
  return Math.floor(
    day.hour(at.hour()).minute(at.minute()).second(0).valueOf() / 1000,
  );
};

/** e.g. "(GMT+07:00) Asia/Saigon" for this computer. */
const timeZoneLabel = () => {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `(GMT${sign}${hours}:${minutes}) ${zone}`;
};

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="setup-section">
      <div className="setup-section-head">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="setup-row">
      <span>{label}</span>
      <Switch checked={checked} onChange={onChange} aria-label={label} />
    </div>
  );
}

export function CreateMeetingDialog({
  open,
  onClose,
  schedule = false,
  onScheduled,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { withLoading } = useLoading();

  const [tab, setTab] = useState<SetupTab>('info');
  const [title, setTitle] = useState('');
  const [password, setPassword] = useState('');
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [startClock, setStartClock] = useState<Dayjs | null>(null);
  const [invitees, setInvitees] = useState<User[]>([]);
  const [cohosts, setCohosts] = useState<User[]>([]);
  const [limitUser, setLimitUser] = useState(50);
  const [waitingRoom, setWaitingRoom] = useState(false);
  const [enableMic, setEnableMic] = useState(true);
  const [enableCamera, setEnableCamera] = useState(true);
  const [enableRecord, setEnableRecord] = useState(true);
  const [enableChat, setEnableChat] = useState(true);
  const [allowRejoin, setAllowRejoin] = useState(true);
  const [allowShare, setAllowShare] = useState(true);
  const [allowLivestream, setAllowLivestream] = useState(false);
  const [autoRecord, setAutoRecord] = useState(false);
  const [folder, setFolder] = useState<string>();
  const [freeSpace, setFreeSpace] = useState<number | null>(null);

  // Where recordings go: the saved choice, else the app's default folder.
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const info: { folder: string; freeBytes: number | null } =
          await ipcRenderer.invoke(
            'recording:folder-info',
            getRecordingFolder(),
          );
        setFolder(info.folder);
        setFreeSpace(info.freeBytes);
      } catch (_) {
        // No folder info: the field stays empty.
      }
    })();
  }, [open]);

  const reset = () => {
    setTab('info');
    setTitle('');
    setPassword('');
    setStartDate(null);
    setStartClock(null);
    setInvitees([]);
    setCohosts([]);
    setAutoRecord(false);
  };

  const pickFolder = async () => {
    const picked: string | null = await ipcRenderer.invoke(
      'recording:pick-folder',
      folder,
    );
    if (!picked) return;
    setRecordingFolder(picked);
    setFolder(picked);
    const info = await ipcRenderer.invoke('recording:folder-info', picked);
    setFreeSpace(info.freeBytes);
  };

  const startTime = pickedStartTime(startDate, startClock);
  const isScheduled = startTime !== undefined && startTime * 1000 > Date.now();

  const handleSubmit = async () => {
    if (schedule && !isScheduled) {
      setTab('info');
      notification.warning({
        message: 'Chọn ngày và giờ bắt đầu trong tương lai',
        placement: 'top',
      });
      return;
    }
    try {
      const result = await withLoading(
        MeetingService.createMeeting({
          title: title.trim(),
          password: password.trim(),
          // 0/absent = start right away.
          startTime: isScheduled ? startTime : undefined,
          limitUser,
          description: '',
          waitingRoom: waitingRoom ? 1 : 0,
          // Despite the names, the backend reads these as "allowed" flags
          // (1 = members may turn it on) — same as the mobile app sends.
          muteAllVideo: enableCamera ? 1 : 0,
          muteAllAudio: enableMic ? 1 : 0,
          muteAllChat: enableChat ? 1 : 0,
          isRecording: enableRecord ? 1 : 0,
          multipleShareScreen: allowShare ? 1 : 0,
          // Stream keys are chosen in the meeting (saved per user), not here.
          allowLivestream: allowLivestream ? 1 : 0,
          invite: [
            ...cohosts.map((u) => ({
              userId: u.id,
              role: MeetingRole.CO_HOST,
            })),
            ...invitees.map((u) => ({
              userId: u.id,
              role: MeetingRole.MEMBER,
            })),
          ],
        }),
      );
      const meetingId = result?.room?.id;
      if (!meetingId) throw new Error('no meeting');
      if (autoRecord) markAutoRecord(meetingId);

      if (isScheduled) {
        notification.success({
          message: 'Đã lên lịch cuộc họp',
          placement: 'top',
        });
        onScheduled?.();
        onClose();
      } else {
        navigate(`/meeting/lobby`, { state: { meetingId } });
      }
    } catch (_) {
      notification.error({
        message: isScheduled
          ? 'Không lên lịch được cuộc họp'
          : 'Không tạo được cuộc họp',
        placement: 'top',
      });
    }
  };

  const hostIds = user?.id ? [user.id] : [];

  const infoTab = (
    <div className="setup-form">
      <label className="setup-field" htmlFor="setup-title">
        <span>Chủ đề cuộc họp</span>
        <input
          id="setup-title"
          className="setup-input"
          placeholder="Nhập chủ đề cuộc họp"
          value={title}
          maxLength={255}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="setup-field" htmlFor="setup-password">
        <span>Mật khẩu cuộc họp</span>
        <input
          id="setup-password"
          className="setup-input"
          placeholder="Bỏ trống nếu muốn hệ thống tự động tạo mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <div className="setup-field">
        <span>Thời gian bắt đầu</span>
        <div className="setup-datetime">
          <DatePicker
            variant="borderless"
            placeholder={schedule ? 'Chọn ngày' : 'Bây giờ'}
            format="DD/MM/YYYY"
            value={startDate}
            onChange={setStartDate}
            disabledDate={(d) => d.isBefore(new Date(), 'day')}
          />
          <TimePicker
            variant="borderless"
            placeholder={schedule ? 'Chọn giờ' : 'Bây giờ'}
            format="HH:mm"
            value={startClock}
            onChange={setStartClock}
          />
        </div>
      </div>
      <div className="setup-field">
        <span>Múi giờ</span>
        <input className="setup-input" value={timeZoneLabel()} disabled />
      </div>
      <div className="setup-field">
        <span>Chủ trì cuộc họp</span>
        <input className="setup-input" value={user?.fullName ?? ''} disabled />
      </div>
      <div className="setup-field">
        <span>Mời thành viên tham gia cuộc họp của bạn</span>
        <UserPicker
          placeholder="Nhập email của thành viên"
          value={invitees}
          onChange={setInvitees}
          excludeIds={[...hostIds, ...cohosts.map((u) => u.id!)]}
        />
      </div>
    </div>
  );

  const settingsTab = (
    <div className="setup-form">
      <Section
        title="Cài đặt cho người tham dự"
        description="Cài đặt người tham dự cho phép Host kiểm soát các quyền của người tham dự trong cuộc họp"
      >
        <div className="setup-rows">
          <div className="setup-row">
            <span>Số lượng người tối đa</span>
            <span className="setup-value">
              <InputNumber
                variant="borderless"
                min={2}
                max={100}
                value={limitUser}
                onChange={(v) => setLimitUser(v ?? 50)}
                controls={false}
              />
              <Icon name="meetingCaretRight" />
            </span>
          </div>
          <SwitchRow
            label="Kích hoạt phòng chờ xét duyệt"
            checked={waitingRoom}
            onChange={setWaitingRoom}
          />
          <SwitchRow
            label="Được phép mở Micro"
            checked={enableMic}
            onChange={setEnableMic}
          />
          <SwitchRow
            label="Được phép mở Webcam"
            checked={enableCamera}
            onChange={setEnableCamera}
          />
          <SwitchRow
            label="Được phép Ghi âm"
            checked={enableRecord}
            onChange={setEnableRecord}
          />
          <SwitchRow
            label="Được phép Chat"
            checked={enableChat}
            onChange={setEnableChat}
          />
          <SwitchRow
            label="Cho phép người bị xóa tham gia lại"
            checked={allowRejoin}
            onChange={setAllowRejoin}
          />
        </div>
      </Section>
      <Section
        title="Trao quyền Co-host"
        description="Co-host sẽ có quyền kiểm soát như Host nếu như Host không còn ở trong phòng. Trao quyền Co-host bằng cách thêm email của người được trao quyền"
      >
        <UserPicker
          placeholder="Nhập email người được trao quyền"
          value={cohosts}
          onChange={setCohosts}
          excludeIds={[...hostIds, ...invitees.map((u) => u.id!)]}
        />
      </Section>
      <Section
        title="Ghi âm"
        description="Ghi âm cho phép người dùng kiểm soát file ghi âm của mình"
      >
        <div className="setup-folder">
          <div className="setup-folder-label">
            <span>Lưu bản ghi âm của tôi ở</span>
            {freeSpace !== null && <small>{formatFreeSpace(freeSpace)}</small>}
          </div>
          <div className="setup-folder-path" title={folder}>
            <Icon name="meetingFolder" />
            <span>{folder}</span>
          </div>
          <button
            type="button"
            className="setup-button small"
            onClick={pickFolder}
          >
            Mở
          </button>
        </div>
        <SwitchRow
          label="Tự động ghi âm khi cuộc họp bắt đầu"
          checked={autoRecord}
          onChange={setAutoRecord}
        />
      </Section>
      <Section
        title="Chia sẻ màn hình"
        description="Cho phép người tham dự chia sẻ màn hình của họ trong cuộc họp"
      >
        <SwitchRow
          label="Cho phép mọi người chia sẻ màn hình"
          checked={allowShare}
          onChange={setAllowShare}
        />
      </Section>
      <Section
        title="Livestream cuộc họp"
        description="Livestream cuộc họp cho phép Host phát trực tiếp cuộc họp trên Facebook và Youtube thông qua tài khoản của Host. Đối với Facebook, Host có thể phát trực tiếp trên dòng thời gian Facebook của mình hoặc một nhóm hoặc trang mà Host là quản trị viên. Đối với Youtube, Host phát trực tiếp lên Kênh Youtube của họ."
      >
        <SwitchRow
          label="Cho phép Livestream cuộc họp"
          checked={allowLivestream}
          onChange={setAllowLivestream}
        />
      </Section>
    </div>
  );

  let submitLabel = 'Bắt đầu cuộc họp';
  if (schedule || isScheduled) submitLabel = 'Lên lịch cuộc họp';

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterClose={reset}
      centered
      width={640}
      footer={null}
      title={null}
      closable={false}
      className="meeting-setup"
    >
      <div className="meeting-setup-header">
        <h2>{schedule ? 'Lên lịch cuộc họp' : 'Tạo cuộc họp mới'}</h2>
        <button
          type="button"
          className="setup-close"
          aria-label="Đóng"
          onClick={onClose}
        >
          <Icon name="meetingClose" />
        </button>
      </div>
      <div className="meeting-setup-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'info'}
          onClick={() => setTab('info')}
        >
          Thông tin cuộc họp
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'settings'}
          onClick={() => setTab('settings')}
        >
          Cài đặt cuộc họp
        </button>
      </div>
      <div className="meeting-setup-body">
        {tab === 'info' ? infoTab : settingsTab}
      </div>
      <div className="meeting-setup-footer">
        <button
          type="button"
          className="setup-button primary"
          onClick={handleSubmit}
        >
          {submitLabel}
        </button>
      </div>
    </Modal>
  );
}
