import './VirtualBackgroundDialog.scss';
import { Button } from '@/renderer/shared/components/Button';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Image, Modal, notification } from 'antd';
import {
  loadVirtualBackground,
  saveVirtualBackground,
} from '@/renderer/shared/utils/virtualBackground';
import { VirtualBackgroundProps, VirtualBackground } from './types';

const { ipcRenderer, nativeImage } = window.require('electron');

const NONE_ID = 'vbg-none';

const toBackground = (
  filePath: string,
  id: string,
  name: string,
  custom = false,
): VirtualBackground => ({
  id,
  type: 'image',
  src: filePath,
  // Rendered from a data URL: the renderer can't load file:// paths.
  filePath: nativeImage
    .createFromPath(filePath)
    .resize({ width: 320 })
    .toDataURL(),
  name,
  custom,
});

export function VirtualBackgroundDialog({
  open,
  onClose,
}: VirtualBackgroundProps) {
  const { t } = useTranslation();
  const [backgrounds, setBackgrounds] = useState<VirtualBackground[]>([]);
  const [customBackgrounds, setCustomBackgrounds] = useState<
    VirtualBackground[]
  >([]);

  useEffect(() => {
    const loadBackgrounds = async () => {
      const virtualBackgrounds = await Promise.all(
        Array.from({ length: 16 }, async (_, index) => {
          const imageNumber = index + 1;
          const imagePath = await ipcRenderer.invoke(
            'get-virtual-background-path',
            imageNumber,
          );
          return toBackground(
            imagePath,
            `vbg-${imageNumber}`,
            // The preset's number; labelled at render (see `labelOf`).
            `${imageNumber}`,
          );
        }),
      );

      setBackgrounds(virtualBackgrounds);
    };

    loadBackgrounds();
  }, []);

  const loadCustomBackgrounds = useCallback(async () => {
    const files: string[] = await ipcRenderer.invoke('custom-backgrounds:list');
    setCustomBackgrounds(
      files.map((file) => toBackground(file, file, '', true)),
    );
  }, []);

  const [selectedSource, setSelectedSource] =
    useState<VirtualBackground | null>(null);
  // What is applied now, highlighted until the user picks something else.
  const [currentSrc, setCurrentSrc] = useState<string>();

  useEffect(() => {
    if (!open) return;
    loadCustomBackgrounds();
    setSelectedSource(null);
    setCurrentSrc(loadVirtualBackground());
  }, [open, loadCustomBackgrounds]);

  const isSelected = (id: string, src: string) =>
    selectedSource
      ? selectedSource.id === id
      : (id === NONE_ID && !currentSrc) || (!!src && src === currentSrc);

  const addCustomBackground = async () => {
    try {
      const file: string | null = await ipcRenderer.invoke(
        'custom-backgrounds:add',
      );
      if (!file) return;
      await loadCustomBackgrounds();
      setSelectedSource(toBackground(file, file, '', true));
    } catch (_) {
      notification.error({
        message: t('meeting.background.add_failed'),
        placement: 'top',
      });
    }
  };

  const removeCustomBackground = (source: VirtualBackground) => {
    Modal.confirm({
      title: t('meeting.background.delete_title'),
      content: t('meeting.background.delete_message'),
      okText: t('common.delete'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        await ipcRenderer.invoke('custom-backgrounds:remove', source.src);
        if (selectedSource?.id === source.id) setSelectedSource(null);
        await loadCustomBackgrounds();
      },
    });
  };

  const apply = () => {
    if (!selectedSource) {
      onClose();
      return;
    }
    // Kept on this device, so it survives restarts and being logged out.
    saveVirtualBackground(
      selectedSource.id === NONE_ID ? undefined : selectedSource.src,
    );
    onClose();
  };

  const labelOf = (source: VirtualBackground) => {
    if (source.id === NONE_ID) return t('meeting.background.not_used');
    if (source.custom) return t('meeting.background.your_image');
    return t('meeting.background.preset', { index: source.name });
  };

  const renderItem = (source: VirtualBackground) => (
    <div
      key={source.id}
      className={`source-item ${isSelected(source.id, source.src) ? 'selected' : ''}`}
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
        <Image src={source.filePath} alt={labelOf(source)} preview={false} />
        {source.custom && (
          <button
            type="button"
            className="remove-btn"
            title={t('meeting.background.delete_this')}
            onClick={(e) => {
              e.stopPropagation();
              removeCustomBackground(source);
            }}
          >
            ×
          </button>
        )}
      </div>
      <span className="source-name">{labelOf(source)}</span>
    </div>
  );

  return (
    <div className={`modal-overlay ${open ? 'open' : ''}`}>
      <div className="modal-container">
        <div className="header">
          <h3>{t('meeting.background.choose')}</h3>
        </div>

        <div className="body">
          <div className="sources-grid">
            <div
              className={`source-item ${isSelected(NONE_ID, '') ? 'selected' : ''}`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setSelectedSource({
                    id: NONE_ID,
                    type: 'none',
                    src: '',
                    filePath: '',
                    name: '',
                  });
                }
              }}
              onClick={() =>
                setSelectedSource({
                  id: NONE_ID,
                  type: 'none',
                  src: '',
                  filePath: '',
                  name: '',
                })
              }
            >
              <div className="thumbnail placeholder">
                {t('meeting.background.no_background')}
              </div>
              <span className="source-name">
                {t('meeting.background.not_used')}
              </span>
            </div>
            <div
              className="source-item"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addCustomBackground();
              }}
              onClick={addCustomBackground}
            >
              <div className="thumbnail placeholder">
                {t('meeting.background.add_image_plus')}
              </div>
              <span className="source-name">
                {t('meeting.background.from_computer')}
              </span>
            </div>
            {customBackgrounds.map(renderItem)}
            {backgrounds.map(renderItem)}
          </div>
        </div>

        <div className="footer">
          <Button
            variant="primary"
            title={t('meeting.background.choose')}
            onClick={apply}
            className="apply-btn"
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
