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
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './LivestreamDialog.scss';

interface Props {
  open: boolean;
  onClose: () => void;
  streams: MeetingLivestream[];
  activeStreams: MeetingLivestream[];
  onStart: (destinationIds: number[]) => Promise<void>;
  onStop: (livestreamId?: number) => Promise<void>;
}

type TFn = TFunction;

const platformLabel = (t: TFn, platform: LivestreamPlatform) => {
  if (platform === 'youtube') return 'YouTube';
  if (platform === 'facebook') return 'Facebook';
  return t('meeting.livestream.platform_custom');
};

// Step-by-step help shown while adding a destination.
const GUIDES = {
  youtube: {
    url: 'https://studio.youtube.com',
    steps: [
      'meeting.livestream.youtube_step1',
      'meeting.livestream.youtube_step2',
      'meeting.livestream.youtube_step3',
    ],
    keyHint: 'meeting.livestream.youtube_key_hint',
    check: /^[a-z0-9]{4}(-[a-z0-9]{4}){3,4}$/i,
  },
  facebook: {
    url: 'https://www.facebook.com/live/producer',
    steps: [
      'meeting.livestream.facebook_step1',
      'meeting.livestream.facebook_step2',
      'meeting.livestream.facebook_step3',
    ],
    keyHint: 'meeting.livestream.facebook_key_hint',
    check: /^FB-/,
  },
  custom: {
    url: undefined,
    steps: [
      'meeting.livestream.custom_step1',
      'meeting.livestream.custom_step2',
    ],
    keyHint: 'meeting.livestream.custom_key_hint',
    check: undefined,
  },
} as const satisfies Record<
  LivestreamPlatform,
  {
    url?: string;
    steps: readonly string[];
    keyHint: string;
    check?: RegExp;
  }
>;

type Guide = {
  url?: string;
  steps: readonly (typeof GUIDES)[LivestreamPlatform]['steps'][number][];
  keyHint: (typeof GUIDES)[LivestreamPlatform]['keyHint'];
  check?: RegExp;
};

const STATUS = {
  starting: {
    color: 'processing',
    label: 'meeting.livestream.status_starting',
  },
  live: { color: 'red', label: 'meeting.livestream.status_live' },
  stopping: { color: 'default', label: 'meeting.livestream.status_stopping' },
  stopped: { color: 'default', label: 'meeting.livestream.status_stopped' },
  failed: { color: 'error', label: 'meeting.livestream.status_failed' },
} as const;

const statusOf = (status: string) =>
  STATUS[status as keyof typeof STATUS] as
    | (typeof STATUS)[keyof typeof STATUS]
    | undefined;

const START_ERRORS = {
  e_livestream_not_allowed: 'meeting.livestream.error_not_allowed',
  e_livestream_too_many_destinations: 'meeting.livestream.error_too_many',
  e_livestream_capacity_full: 'meeting.livestream.error_capacity',
  e_livestream_destination_invalid: 'meeting.livestream.error_invalid',
  e_livestream_destination_not_found: 'meeting.livestream.error_not_found',
  e_permission_denined: 'meeting.livestream.error_permission',
} as const;

const startError = (t: TFn, e: unknown) => {
  const key = START_ERRORS[livestreamErrorCode(e) as keyof typeof START_ERRORS];
  return key ? t(key) : undefined;
};

/** Turns Agora/CDN failure reasons into something a user can act on. */
const friendlyFailure = (t: TFn, reason: string) => {
  if (/rtmpUrl|url|key/i.test(reason)) {
    return t('meeting.livestream.failure_key');
  }
  return t('meeting.livestream.failure_connect');
};

export function LivestreamDialog({
  open,
  onClose,
  streams,
  activeStreams,
  onStart,
  onStop,
}: Props) {
  const { t } = useTranslation();
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
      setError(t('meeting.livestream.load_failed'));
    }
  }, [t]);

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
  const guide: Guide = GUIDES[platform];
  const keyHint = t(guide.keyHint);
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
      setError(t('meeting.livestream.key_required'));
      return;
    }
    if (platform === 'custom' && !/^rtmps?:\/\//i.test(serverUrl.trim())) {
      setError(t('meeting.livestream.server_url_invalid'));
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
      setError(startError(t, e) || t('meeting.livestream.save_failed'));
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
      setError(startError(t, e) || t('meeting.livestream.start_failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('meeting.livestream.title')}
      footer={null}
      centered
      width={560}
      className="livestream-dialog"
    >
      {activeStreams.length > 0 && (
        <section className="livestream-section">
          <Typography.Text strong>
            {t('meeting.livestream.live_now')}
          </Typography.Text>
          {activeStreams.map((s) => (
            <div key={s.id} className="livestream-row">
              <span>
                {s.name} <small>({platformLabel(t, s.platform)})</small>
              </span>
              <span className="livestream-row-actions">
                <Tag color={statusOf(s.status)?.color}>
                  {statusOf(s.status) && t(statusOf(s.status)!.label)}
                </Tag>
                {s.status !== 'stopping' && (
                  <Typography.Link onClick={() => onStop(s.id)}>
                    {t('meeting.livestream.stop')}
                  </Typography.Link>
                )}
              </span>
            </div>
          ))}
          {activeStreams.length > 1 && (
            <Typography.Link onClick={() => onStop()}>
              {t('meeting.livestream.stop_all')}
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
          message={`${s.name}: ${friendlyFailure(t, s.errorReason)}`}
        />
      ))}

      <section className="livestream-section">
        <Typography.Text strong>
          {t('meeting.livestream.choose')}
        </Typography.Text>
        {destinations.length === 0 && !adding && (
          <Typography.Text type="secondary">
            {t('meeting.livestream.none')}
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
                {d.name} <small>({platformLabel(t, d.platform)})</small>
                <small className="livestream-key">{d.streamKeyMasked}</small>
              </Checkbox>
              {!isActive && (
                <Popconfirm
                  title={t('meeting.livestream.delete_confirm')}
                  okText={t('common.delete')}
                  cancelText={t('common.cancel')}
                  onConfirm={() => removeDestination(d.id)}
                >
                  <Typography.Link type="danger">
                    {t('common.delete')}
                  </Typography.Link>
                </Popconfirm>
              )}
            </div>
          );
        })}

        {!adding ? (
          <Typography.Link onClick={() => setAdding(true)}>
            {t('meeting.livestream.add')}
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
                {
                  label: t('meeting.livestream.platform_custom'),
                  value: 'custom',
                },
              ]}
            />
            <ol className="livestream-guide">
              {guide.steps.map((step) => (
                <li key={step}>{t(step)}</li>
              ))}
            </ol>
            {guide.url && (
              <Typography.Link onClick={() => window.open(guide.url, '_blank')}>
                {t('meeting.livestream.open_key_page')}
              </Typography.Link>
            )}
            <Input
              placeholder={t('meeting.livestream.name_placeholder', {
                platform: platformLabel(t, platform),
              })}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {platform === 'custom' && (
              <Input
                placeholder={t('meeting.livestream.server_url_placeholder')}
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
              />
            )}
            <Input.Password
              placeholder={t('meeting.livestream.key_placeholder', {
                hint: keyHint,
              })}
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
            />
            {keyLooksWrong && (
              <Typography.Text type="warning">
                {t('meeting.livestream.key_format_warning', { hint: keyHint })}
              </Typography.Text>
            )}
            <div className="livestream-form-actions">
              <Button
                variant="outline"
                title={t('meeting.livestream.save')}
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
                  {t('common.cancel')}
                </Typography.Link>
              )}
            </div>
            <Typography.Text type="secondary" className="livestream-note">
              {t('meeting.livestream.key_note')}
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
            ? t('meeting.livestream.start_count', { count: selected.length })
            : t('meeting.livestream.choose_to_start')
        }
        disabled={busy || selected.length === 0}
        onClick={start}
      />
      <Typography.Text type="secondary" className="livestream-note">
        {t('meeting.livestream.everyone_notice')}
      </Typography.Text>
    </Modal>
  );
}
