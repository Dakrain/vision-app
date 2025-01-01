import './ShareScreenDialog.scss';
import { thumbImageBufferToBase64 } from '@/renderer/shared/utils/base64';
import { Button } from '@/renderer/shared/components/Button';
import { ScreenCaptureSourceInfo } from 'agora-electron-sdk';
import { useEffect, useState } from 'react';
import { ShareScreenDialogProps } from './types';

export function ShareScreenDialog({
  open,
  onClose,
  onShare,
  sources,
}: ShareScreenDialogProps) {
  const [selectedSource, setSelectedSource] =
    useState<ScreenCaptureSourceInfo | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectedSource(null);
    }
  }, [open]);

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`}>
      <div className="modal-container">
        <div className="header">
          <h3>Chia sẻ màn hình</h3>
        </div>

        <div className="body">
          <div className="sources-grid">
            {sources.map((source) => (
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
            ))}
          </div>
        </div>

        <div className="footer">
          <Button
            variant="primary"
            title="Chia sẻ"
            onClick={() => {
              if (selectedSource) {
                onShare(selectedSource);
              }
            }}
            className="share-btn"
          />
          <Button
            variant="outline"
            title="Hủy"
            onClick={onClose}
            className="cancel-btn"
          />
        </div>
      </div>
    </div>
  );
}
