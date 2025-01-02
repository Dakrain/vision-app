import './VirtualBackgroundDialog.scss';
import { Button } from '@/renderer/shared/components/Button';
import { useState } from 'react';

import AgoraEngineService from '@/renderer/shared/services/Agora';
import { VirtualBackgroundProps, VirtualBackground } from './types';

const { BackgroundSourceType } = window.require('agora-electron-sdk');

export function VirtualBackgroundDialog({
  open,
  onClose,
}: VirtualBackgroundProps) {
  const virtualBackgrounds = Array.from({ length: 16 }, (_, index) => ({
    id: `vbg-${index + 1}`,
    type: 'image',
    src: require(
      `/assets/images/virtual_background/virtual_background_${index + 1}.jpg`,
    ),
    name: `Virtual Background ${index + 1}`,
  }));

  const [selectedSource, setSelectedSource] =
    useState<VirtualBackground | null>(null);

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`}>
      <div className="modal-container">
        <div className="header">
          <h3>Chọn phong nền</h3>
        </div>

        <div className="body">
          <div className="sources-grid">
            {virtualBackgrounds.map((source) => (
              <div
                key={source.id}
                className={`source-item ${selectedSource?.id === source.id ? 'selected' : ''}`}
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
                  <img src={source.src} alt={source.name} />
                </div>
                <span className="source-name">{source.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="footer">
          <Button
            variant="primary"
            title="Chọn phong nền"
            onClick={() => {
              if (selectedSource) {
                // TODO: set virtual background
                AgoraEngineService.enableVirtualBackground(
                  true,
                  {
                    background_source_type: BackgroundSourceType.BackgroundImg,
                    source: selectedSource.src,
                  },
                  {},
                );
              }
            }}
            className="apply-btn"
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
