import { Button } from '@/shared/components/Button';
import LivestreamService from '@/shared/services/Livestream/LivestreamService';
import { livestreamErrorCode } from '@/shared/hooks/useLivestream';
import {
  LivestreamDestination,
  LivestreamPlatform,
  MeetingLivestream,
} from '@/renderer/shared/types/livestream';
import {
  Alert,
  Checkbox,
  Input,
  Modal,
  Popconfirm,
  Segmented,
  Tag,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useState } from 'react';
import './LivestreamDialog.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  streams: MeetingLivestream[];
  activeStreams: MeetingLivestream[];
  onStart: (destinationIds: number[]) => Promise<void>;
  onStop: (livestreamId?: number) => Promise<void>;
}

const PLATFORM_LABEL: Record<LivestreamPlatform, string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  custom: 'Khác (RTMP)',
};

// Step-by-step help shown while adding a destination.
const GUIDES: Record<
  LivestreamPlatform,
  { url?: string; steps: string[]; keyHint: string; check?: RegExp }
> = {
  youtube: {
    url: 'https://studio.youtube.com',
    steps: [
      'Mở YouTube Studio trên máy tính → bấm Tạo → Phát trực tiếp.',
      'Lần đầu phát trực tiếp, YouTube cần khoảng 24 giờ để kích hoạt kênh.',
      'Chọn "Phần mềm phát trực tiếp" (Streaming software) → sao chép "Khoá sự kiện phát trực tiếp".',
    ],
    keyHint: 'Dạng xxxx-xxxx-xxxx-xxxx-xxxx',
    check: /^[a-z0-9]{4}(-[a-z0-9]{4}){3,4}$/i,
  },
  facebook: {
    url: 'https://www.facebook.com/live/producer',
    steps: [
      'Mở Facebook Live Producer → bấm Phát trực tiếp, chọn trang cá nhân hoặc Page của bạn.',
      'Chọn "Phần mềm phát trực tiếp" (Streaming software) → sao chép "Khoá luồng".',
      'Bật "Sử dụng khoá luồng cố định" để lưu một lần, dùng cho các lần sau.',
    ],
    keyHint: 'Bắt đầu bằng FB-',
    check: /^FB-/,
  },
  custom: {
    steps: [
      'Dùng cho TikTok, Twitch, Vimeo… hoặc máy chủ RTMP riêng.',
      'Sao chép "Server URL" (bắt đầu bằng rtmp:// hoặc rtmps://) và "Stream key" từ trang quản lý live của nền tảng.',
    ],
    keyHint: 'Stream key của nền tảng',
  },
};

const STATUS: Record<string, { color: string; label: string }> = {
  starting: { color: 'processing', label: 'Đang kết nối' },
  live: { color: 'red', label: '● Đang phát' },
  stopping: { color: 'default', label: 'Đang dừng' },
  stopped: { color: 'default', label: 'Đã dừng' },
  failed: { color: 'error', label: 'Lỗi' },
};

const START_ERRORS: Record<string, string> = {
  e_livestream_not_allowed: 'Cuộc họp này không cho phép phát trực tiếp.',
  e_livestream_too_many_destinations:
    'Mỗi cuộc họp chỉ phát tối đa 3 nơi cùng lúc.',
  e_livestream_capacity_full:
    'Hệ thống đang có quá nhiều buổi phát trực tiếp, vui lòng thử lại sau.',
  e_livestream_destination_invalid: 'Khoá hoặc địa chỉ máy chủ không hợp lệ.',
  e_livestream_destination_not_found: 'Không tìm thấy nơi phát đã chọn.',
  e_permission_denined: 'Chỉ Host hoặc Co-host được phát trực tiếp.',
};

/** Turns Agora/CDN failure reasons into something a user can act on. */
const friendlyFailure = (reason: string) => {
  if (/rtmpUrl|url|key/i.test(reason)) {
    return 'Khoá phát trực tiếp hoặc địa chỉ máy chủ không đúng / đã hết hạn. Hãy lấy khoá mới.';
  }
  return 'Không kết nối được tới nền tảng phát. Vui lòng thử lại.';
};

export function LivestreamDialog({
  open,
  onClose,
  streams,
  activeStreams,
  onStart,
  onStop,
}: Props) {
  const [destinations, setDestinations] = useState<LivestreamDestination[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [adding, setAdding] = useState(false);
  const [platform, setPlatform] = useState<LivestreamPlatform>('youtube');
  const [name, setName] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const [streamKey, setStreamKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await LivestreamService.fetchDestinations();
      setDestinations(res.rows ?? []);
      setAdding((res.rows ?? []).length === 0);
    } catch (_) {
      setError('Không tải được danh sách nơi phát.');
    }
  }, []);

  useEffect(() => {
    if (open) {
      setError('');
      load();
    }
  }, [open, load]);

  const activeDestinationIds = useMemo(
    () => activeStreams.map((s) => s.destinationId).filter(Boolean),
    [activeStreams],
  );
  const recentFailures = streams.filter(
    (s) =>
      s.status === 'failed' &&
      !activeDestinationIds.includes(s.destinationId) &&
      s.errorReason,
  );
  const guide = GUIDES[platform];
  const keyLooksWrong =
    !!streamKey && !!guide.check && !guide.check.test(streamKey.trim());

  const resetForm = () => {
    setName('');
    setServerUrl('');
    setStreamKey('');
  };

  const saveDestination = async () => {
    setError('');
    if (!streamKey.trim()) {
      setError('Vui lòng dán khoá phát trực tiếp.');
      return;
    }
    if (platform === 'custom' && !/^rtmps?:\/\//i.test(serverUrl.trim())) {
      setError('Server URL phải bắt đầu bằng rtmp:// hoặc rtmps://');
      return;
    }
    setBusy(true);
    try {
      const created = await LivestreamService.createDestination({
        platform,
        name: name.trim() || undefined,
        serverUrl: platform === 'custom' ? serverUrl.trim() : undefined,
        streamKey: streamKey.trim(),
      });
      setDestinations((prev) => [created, ...prev]);
      setSelected((prev) => [...prev, created.id]);
      resetForm();
      setAdding(false);
    } catch (e) {
      setError(
        START_ERRORS[livestreamErrorCode(e)] || 'Không lưu được nơi phát.',
      );
    } finally {
      setBusy(false);
    }
  };

  const removeDestination = async (id: number) => {
    await LivestreamService.deleteDestination(id).catch(() => {});
    setDestinations((prev) => prev.filter((d) => d.id !== id));
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const start = async () => {
    setError('');
    setBusy(true);
    try {
      await onStart(selected);
      setSelected([]);
    } catch (e) {
      setError(
        START_ERRORS[livestreamErrorCode(e)] ||
          'Không bắt đầu phát trực tiếp được.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title="Phát trực tiếp"
      footer={null}
      centered
      width={560}
      className="livestream-dialog"
    >
      {activeStreams.length > 0 && (
        <section className="livestream-section">
          <Typography.Text strong>Đang phát</Typography.Text>
          {activeStreams.map((s) => (
            <div key={s.id} className="livestream-row">
              <span>
                {s.name} <small>({PLATFORM_LABEL[s.platform]})</small>
              </span>
              <span className="livestream-row-actions">
                <Tag color={STATUS[s.status]?.color}>
                  {STATUS[s.status]?.label}
                </Tag>
                {s.status !== 'stopping' && (
                  <Typography.Link onClick={() => onStop(s.id)}>
                    Dừng
                  </Typography.Link>
                )}
              </span>
            </div>
          ))}
          {activeStreams.length > 1 && (
            <Typography.Link onClick={() => onStop()}>
              Dừng tất cả
            </Typography.Link>
          )}
        </section>
      )}

      {recentFailures.slice(0, 3).map((s) => (
        <Alert
          key={s.id}
          type="error"
          showIcon
          className="livestream-alert"
          message={`${s.name}: ${friendlyFailure(s.errorReason)}`}
        />
      ))}

      <section className="livestream-section">
        <Typography.Text strong>Chọn nơi phát</Typography.Text>
        {destinations.length === 0 && !adding && (
          <Typography.Text type="secondary">
            Chưa có nơi phát nào.
          </Typography.Text>
        )}
        {destinations.map((d) => {
          const isActive = activeDestinationIds.includes(d.id);
          return (
            <div key={d.id} className="livestream-row">
              <Checkbox
                disabled={isActive}
                checked={isActive || selected.includes(d.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked
                      ? [...prev, d.id]
                      : prev.filter((x) => x !== d.id),
                  )
                }
              >
                {d.name} <small>({PLATFORM_LABEL[d.platform]})</small>
                <small className="livestream-key">{d.streamKeyMasked}</small>
              </Checkbox>
              {!isActive && (
                <Popconfirm
                  title="Xóa nơi phát này?"
                  okText="Xóa"
                  cancelText="Hủy"
                  onConfirm={() => removeDestination(d.id)}
                >
                  <Typography.Link type="danger">Xóa</Typography.Link>
                </Popconfirm>
              )}
            </div>
          );
        })}

        {!adding ? (
          <Typography.Link onClick={() => setAdding(true)}>
            + Thêm nơi phát
          </Typography.Link>
        ) : (
          <div className="livestream-form">
            <Segmented
              block
              value={platform}
              onChange={(value) => {
                setPlatform(value as LivestreamPlatform);
                setError('');
              }}
              options={[
                { label: 'YouTube', value: 'youtube' },
                { label: 'Facebook', value: 'facebook' },
                { label: 'Khác (RTMP)', value: 'custom' },
              ]}
            />
            <ol className="livestream-guide">
              {guide.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {guide.url && (
              <Typography.Link onClick={() => window.open(guide.url, '_blank')}>
                Mở trang lấy khoá ↗
              </Typography.Link>
            )}
            <Input
              placeholder={`Tên hiển thị (vd: Kênh ${PLATFORM_LABEL[platform]} của tôi)`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {platform === 'custom' && (
              <Input
                placeholder="Server URL (rtmp://… hoặc rtmps://…)"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
            )}
            <Input.Password
              placeholder={`Dán khoá phát trực tiếp — ${guide.keyHint}`}
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
            />
            {keyLooksWrong && (
              <Typography.Text type="warning">
                Khoá có vẻ không đúng định dạng ({guide.keyHint}). Hãy kiểm tra
                lại trước khi lưu.
              </Typography.Text>
            )}
            <div className="livestream-form-actions">
              <Button
                variant="outline"
                title="Lưu nơi phát"
                disabled={busy}
                onClick={saveDestination}
              />
              {destinations.length > 0 && (
                <Typography.Link
                  onClick={() => {
                    resetForm();
                    setAdding(false);
                  }}
                >
                  Hủy
                </Typography.Link>
              )}
            </div>
            <Typography.Text type="secondary" className="livestream-note">
              Khoá được mã hoá và lưu theo tài khoản của bạn, dùng lại được cho
              các cuộc họp sau trên cả máy tính và điện thoại.
            </Typography.Text>
          </div>
        )}
      </section>

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          className="livestream-alert"
        />
      )}

      <Button
        variant="primary"
        title={
          selected.length > 0
            ? `Bắt đầu phát (${selected.length} nơi)`
            : 'Chọn nơi phát để bắt đầu'
        }
        disabled={busy || selected.length === 0}
        onClick={start}
      />
      <Typography.Text type="secondary" className="livestream-note">
        Mọi người trong cuộc họp sẽ thấy nhãn LIVE và được thông báo rằng cuộc
        họp đang được phát trực tiếp.
      </Typography.Text>
    </Modal>
  );
}
