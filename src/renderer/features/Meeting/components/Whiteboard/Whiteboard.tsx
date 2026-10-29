import { useEffect, useRef } from 'react';
import { Modal } from 'antd';
import { Excalidraw } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/dist/types/excalidraw/types';
import '@excalidraw/excalidraw/index.css';
import type {
  WhiteboardElement,
  WhiteboardSync,
} from '@/renderer/shared/utils/whiteboardSync';
import './Whiteboard.scss';

type Props = {
  sync: WhiteboardSync;
  /** Who opened it, for the title bar. */
  ownerName: string;
  /** False: view only (the board is locked for me). */
  canEdit: boolean;
  locked: boolean;
  /** The owner and hosts can lock or close the board. */
  canControl: boolean;
  onToggleLock: () => void;
  onClose: () => void;
};

/**
 * The meeting whiteboard: Excalidraw kept in sync by `sync`. Loaded on
 * demand (it is large), shown in place of the main video.
 */
export default function Whiteboard({
  sync,
  ownerName,
  canEdit,
  locked,
  canControl,
  onToggleLock,
  onClose,
}: Props) {
  const api = useRef<ExcalidrawImperativeAPI>();

  // Closing wipes the board for everyone: ask first unless it's empty.
  const confirmClose = () => {
    if (!sync.elements().some((e) => !e.isDeleted)) {
      onClose();
      return;
    }
    Modal.confirm({
      title: 'Đóng bảng trắng?',
      content: 'Bảng trắng sẽ đóng với mọi người và nội dung đã vẽ sẽ mất.',
      okText: 'Đóng',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      centered: true,
      onOk: onClose,
    });
  };

  // Someone else drew: redraw from the shared scene.
  useEffect(
    () =>
      sync.subscribe(() => {
        api.current?.updateScene({ elements: sync.elements() as any });
      }),
    [sync],
  );

  return (
    <div className="whiteboard">
      <div className="whiteboard-bar">
        <span className="whiteboard-title">
          Bảng trắng · {ownerName}
          {locked && <span className="whiteboard-locked">Chỉ xem</span>}
        </span>
        {canControl && (
          <div className="whiteboard-actions">
            <button type="button" onClick={onToggleLock}>
              {locked ? 'Cho mọi người vẽ' : 'Khoá (chỉ xem)'}
            </button>
            <button type="button" className="danger" onClick={confirmClose}>
              Đóng bảng trắng
            </button>
          </div>
        )}
      </div>
      <div className="whiteboard-canvas">
        <Excalidraw
          excalidrawAPI={(instance) => {
            api.current = instance;
          }}
          initialData={{
            elements: sync.elements() as any,
            appState: { viewBackgroundColor: '#ffffff' },
          }}
          onChange={(elements) => {
            if (canEdit) {
              sync.local(elements as unknown as WhiteboardElement[]);
            }
          }}
          viewModeEnabled={!canEdit}
          langCode="vi-VN"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              export: false,
              toggleTheme: false,
              clearCanvas: canControl,
              saveAsImage: true,
            },
            // Pictures would not fit through the chat channel.
            tools: { image: false },
          }}
        />
      </div>
    </div>
  );
}
