import { Modal } from 'antd';
import { ScreenCaptureSourceInfo } from 'agora-electron-sdk';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/renderer/shared/components/Button';
import { thumbImageBufferToBase64 } from '@/renderer/shared/utils/base64';
import { ShareScreenDialogProps } from './types';
import './ShareScreenDialog.scss';

/** macOS windows nobody shares: permission prompts, crash reports… */
const SYSTEM_WINDOWS = [
  'universalAccessAuthWarn',
  'UserNotificationCenter',
  'Problem Reporter',
  'CoreServicesUIAgent',
  'SecurityAgent',
  'Control Center',
  'Notification Center',
];

/**
 * The app's own window: sharing it mirrors the meeting into itself.
 * Packaged it's Vision20.app; in development, Electron showing "Vision20".
 */
const isOwnWindow = (source: ScreenCaptureSourceInfo) =>
  /\/Vision20\.app/i.test(source.processPath ?? '') ||
  (/\/Electron\.app$/.test(source.processPath ?? '') &&
    source.sourceTitle === 'Vision20');

const isSystemWindow = (source: ScreenCaptureSourceInfo) =>
  SYSTEM_WINDOWS.some(
    (name) =>
      source.sourceName === name ||
      (source.processPath ?? '').includes(`/${name}.app`),
  );

/** The screens, then the windows worth sharing. */
export const shareableSources = (sources: ScreenCaptureSourceInfo[]) => ({
  screens: sources.filter((s) => !s.processPath),
  windows: sources.filter(
    (s) => !!s.processPath && !isOwnWindow(s) && !isSystemWindow(s),
  ),
});

export function ShareScreenDialog({
  open,
  onClose,
  onShare,
  sources,
}: ShareScreenDialogProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<ScreenCaptureSourceInfo | null>(
    null,
  );
  const { screens, windows } = useMemo(
    () => shareableSources(sources),
    [sources],
  );

  useEffect(() => {
    if (!open) setSelected(null);
  }, [open]);

  const item = (
    source: ScreenCaptureSourceInfo,
    name: string,
    detail?: string,
  ) => (
    <div
      key={source.sourceId}
      className={`share-source${selected?.sourceId === source.sourceId ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={selected?.sourceId === source.sourceId}
      onClick={() => setSelected(source)}
      onDoubleClick={() => onShare(source)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onShare(source);
        if (e.key === ' ') setSelected(source);
      }}
    >
      <div className="share-source-thumb">
        <img src={thumbImageBufferToBase64(source.thumbImage)} alt="" />
      </div>
      <div className="share-source-name">{name}</div>
      {detail && <div className="share-source-detail">{detail}</div>}
    </div>
  );

  return (
    <Modal
      open={open}
      onCancel={onClose}
      title={t('meeting.share.title')}
      centered
      width="min(960px, 90vw)"
      className="share-dialog"
      destroyOnClose
      footer={
        <div className="share-dialog-footer">
          <Button
            variant="outline"
            title={t('common.cancel')}
            onClick={onClose}
          />
          <Button
            variant="primary"
            title={t('meeting.share.share')}
            disabled={!selected}
            onClick={() => selected && onShare(selected)}
          />
        </div>
      }
    >
      <div className="share-dialog-body">
        <section>
          <h4>{t('meeting.share.desktop')}</h4>
          <div className="share-grid">
            {screens.map((s, i) =>
              item(s, t('meeting.share.screen_n', { n: i + 1 })),
            )}
          </div>
        </section>
        <section>
          <h4>{t('meeting.share.app_windows')}</h4>
          {windows.length ? (
            <div className="share-grid">
              {windows.map((s) =>
                item(s, s.sourceName ?? '', s.sourceTitle || undefined),
              )}
            </div>
          ) : (
            <p className="share-empty">{t('meeting.share.empty_windows')}</p>
          )}
        </section>
      </div>
    </Modal>
  );
}
