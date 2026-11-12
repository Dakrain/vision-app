import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import type { ScreenCaptureSourceInfo } from 'agora-electron-sdk';
import { ShareScreenDialog } from '../renderer/features/Meeting/components/ShareScreenDialog/ShareScreenDialog';
import { modalConfig } from '../renderer/theme';
import i18n from '../renderer/i18n';

jest.mock('../renderer/shared/utils/base64', () => ({
  thumbImageBufferToBase64: () => 'data:image/png;base64,AAAA',
}));

const src = (s: Partial<ScreenCaptureSourceInfo>) =>
  ({ thumbImage: {}, iconImage: {}, ...s }) as ScreenCaptureSourceInfo;

const SOURCES = [
  src({ sourceId: 1, sourceName: 'screen-1', processPath: '', type: 1 }),
  src({ sourceId: 2, sourceName: 'screen-2', processPath: '', type: 1 }),
  src({
    sourceId: 10,
    sourceName: 'Zoom',
    sourceTitle: 'Zoom Meeting',
    processPath: '/Applications/zoom.us.app',
    type: 0,
  }),
  src({
    sourceId: 11,
    sourceName: 'Electron',
    sourceTitle: 'Vision20',
    processPath: '/x/node_modules/electron/dist/Electron.app',
    type: 0,
  }),
  src({
    sourceId: 12,
    sourceName: 'Vision20',
    sourceTitle: 'Vision20',
    processPath: '/Applications/Vision20.app',
    type: 0,
  }),
  src({
    sourceId: 13,
    sourceName: 'universalAccessAuthWarn',
    sourceTitle: 'Screen Recording',
    processPath:
      '/System/Library/PrivateFrameworks/UniversalAccess.framework/Versions/A/Resources/universalAccessAuthWarn.app',
    type: 0,
  }),
  src({
    sourceId: 14,
    sourceName: 'Problem Reporter',
    sourceTitle: 'Problem Report for x',
    processPath: '/System/Library/CoreServices/Problem Reporter.app',
    type: 0,
  }),
];

const wait = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });

beforeAll(async () => {
  await i18n.changeLanguage('vi');
});

const pump = (props: Partial<Parameters<typeof ShareScreenDialog>[0]> = {}) =>
  render(
    <ConfigProvider modal={modalConfig}>
      <ShareScreenDialog
        sources={props.sources ?? SOURCES}
        open={props.open ?? true}
        onClose={props.onClose ?? (() => {})}
        onShare={props.onShare ?? (() => {})}
      />
    </ConfigProvider>,
  );

describe('ShareScreenDialog', () => {
  it('shows screens and windows in Vietnamese, by name and title', async () => {
    pump();
    await wait();
    expect(screen.getByText('Màn hình')).toBeInTheDocument();
    expect(screen.getByText('Cửa sổ ứng dụng')).toBeInTheDocument();
    expect(screen.getByText('Màn hình 1')).toBeInTheDocument();
    expect(screen.getByText('Màn hình 2')).toBeInTheDocument();
    expect(screen.getByText('Zoom')).toBeInTheDocument();
    expect(screen.getByText('Zoom Meeting')).toBeInTheDocument();
    expect(screen.queryByText('screen-1')).toBeNull();
  });

  it("leaves out the app's own window and system prompts", async () => {
    pump();
    await wait();
    expect(screen.queryByText('Electron')).toBeNull();
    expect(screen.queryByText('Vision20')).toBeNull();
    expect(screen.queryByText('universalAccessAuthWarn')).toBeNull();
    expect(screen.queryByText('Problem Reporter')).toBeNull();
  });

  it('shares only once something is picked; a double click shares it', async () => {
    const onShare = jest.fn();
    pump({ onShare });
    await wait();
    const share = screen.getByRole('button', { name: 'Chia sẻ' });
    expect(share).toBeDisabled();

    fireEvent.click(screen.getByText('Zoom'));
    expect(share).toBeEnabled();
    fireEvent.click(share);
    expect(onShare).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceId: 10 }),
    );

    fireEvent.doubleClick(screen.getByText('Màn hình 2'));
    expect(onShare).toHaveBeenLastCalledWith(
      expect.objectContaining({ sourceId: 2 }),
    );
  });

  it('closes with its X like every window, cancel on the left', async () => {
    const onClose = jest.fn();
    pump({ onClose });
    await wait();
    const close = document.querySelector('.ant-modal-close .app-close-icon');
    expect(close).toBeInTheDocument();
    fireEvent.click(close!);
    expect(onClose).toHaveBeenCalled();

    const buttons = [
      ...document.querySelectorAll('.share-dialog-footer button'),
    ].map((b) => b.textContent);
    expect(buttons).toEqual(['Hủy', 'Chia sẻ']);
  });
});
