import { Button } from '@/renderer/shared/components/Button';
import { thumbImageBufferToBase64 } from '@/renderer/shared/utils/base64';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './ShareScreenDialog.scss';
import { ScreenCaptureSourceInfo } from 'agora-electron-sdk';
import { ShareScreenDialogProps } from './types';

export function ShareScreenDialog({
  open,
  onClose,
  onShare,
  sources,
}: ShareScreenDialogProps) {
  const { t } = useTranslation();
  const [selectedSource, setSelectedSource] =
    useState<ScreenCaptureSourceInfo | null>(null);

  console.log(sources);
  // Phân loại sources thành desktop và application windows
  const desktopSources = sources.filter(
    (source) => source.processPath === '', // Desktop type
  );

  const applicationSources = sources.filter(
    (source) => source.processPath !== '', // Window type
  );

  useEffect(() => {
    if (!open) {
      setSelectedSource(null);
    }
  }, [open]);

  function SourceItem({ source }: { source: ScreenCaptureSourceInfo }) {
    return (
      <div
        key={source.sourceId}
        className={`source-item ${selectedSource?.sourceId === source.sourceId ? 'selected' : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setSelectedSource(source);
          }
        }}
        onClick={() => {
          setSelectedSource(source);
        }}
      >
        <div className="thumbnail">
          <img
            src={thumbImageBufferToBase64(source.thumbImage)}
            alt={source.sourceName}
          />
        </div>
        <span className="source-name">{source.sourceName}</span>
      </div>
    );
  }

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`}>
      <div className="modal-container">
        <div className="header">
          <h3>{t('meeting.share.title')}</h3>
        </div>

        <div className="body">
          <div className="sources-container">
            <div className="sources-section desktop">
              <h4>{t('meeting.share.desktop')}</h4>
              <div className="sources-grid">
                {desktopSources.map((source) => (
                  <SourceItem key={source.sourceId} source={source} />
                ))}
              </div>
            </div>

            <div className="sources-section applications">
              <h4>{t('meeting.share.app_windows')}</h4>
              <div className="sources-grid">
                {applicationSources.map((source) => (
                  <SourceItem key={source.sourceId} source={source} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="footer">
          <Button
            variant="primary"
            title={t('meeting.share.share')}
            onClick={() => {
              if (selectedSource) {
                onShare(selectedSource);
              }
            }}
            className="share-btn"
          />
          <Button
            variant="outline"
            title={t('common.cancel')}
            onClick={onClose}
            className="cancel-btn"
          />
        </div>
      </div>
    </div>
  );
}
