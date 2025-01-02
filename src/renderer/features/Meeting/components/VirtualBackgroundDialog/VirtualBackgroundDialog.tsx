import './VirtualBackgroundDialog.scss';
import { Button } from '@/renderer/shared/components/Button';
import { useEffect, useState } from 'react';

import AgoraEngineService from '@/renderer/shared/services/Agora';
import { VirtualBackgroundProps, VirtualBackground } from './types';
const { ipcRenderer, nativeImage } = window.require('electron');

import {
  BackgroundBlurDegree,
  BackgroundSourceType,
  MediaSourceType,
} from 'agora-electron-sdk';
import { Image } from 'antd';

export function VirtualBackgroundDialog({
  open,
  onClose,
}: VirtualBackgroundProps) {
  const [backgrounds, setBackgrounds] = useState<VirtualBackground[]>([]);

  useEffect(() => {
    const loadBackgrounds = async () => {
      const virtualBackgrounds = await Promise.all(
        Array.from({ length: 16 }, async (_, index) => {
          const imageNumber = index + 1;
          const imagePath = await ipcRenderer.invoke(
            'get-virtual-background-path',
            imageNumber,
          );

          // Convert file path to data URL for display
          const nativeImg = nativeImage.createFromPath(imagePath);
          const dataUrl = nativeImg.toDataURL();

          return {
            id: `vbg-${imageNumber}`,
            type: 'image',
            src: imagePath,
            filePath: dataUrl,
            name: `Virtual Background ${imageNumber}`,
          };
        }),
      );

      setBackgrounds(virtualBackgrounds);
    };

    loadBackgrounds();
  }, []);

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
            {backgrounds.map((source) => (
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
                  <Image
                    src={source.filePath}
                    alt={source.name}
                    preview={false}
                  />
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
              AgoraEngineService.enableVirtualBackground(
                true,
                {
                  background_source_type: BackgroundSourceType.BackgroundImg,
                  source: selectedSource?.src,
                  blur_degree: BackgroundBlurDegree.BlurDegreeLow,
                },
                {
                  greenCapacity: 0.2,
                },
                MediaSourceType.PrimaryCameraSource,
              );

              onClose();
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
