import '@testing-library/jest-dom';
import '../renderer/i18n';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ConfigProvider, Modal } from 'antd';
import { configureStaticDialogs, modalConfig } from '../renderer/theme';
import { LogoutDialog } from '../renderer/features/Home/pages/Setting/LogoutDialog';
import { RoomPermissions } from '../renderer/features/Meeting/components/RoomPermissions/RoomPermissions';
import { confirmDialog } from '../renderer/shared/utils/confirmDialog';

// Every window that opens has a close (X) at its top right, the app's own
// icon (Figma's) — not antd's small one, and not none at all.
const wait = () =>
  act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });

afterEach(() => {
  Modal.destroyAll();
});

describe('close buttons', () => {
  it("a dialog's X is the app's icon", async () => {
    render(
      <ConfigProvider modal={modalConfig}>
        <Modal open title="Thiết bị" onCancel={() => {}}>
          …
        </Modal>
      </ConfigProvider>,
    );
    await wait();
    expect(
      document.querySelector('.ant-modal-close .app-close-icon'),
    ).toBeInTheDocument();
  });

  it('a confirm dialog has an X too, which cancels it', async () => {
    configureStaticDialogs();
    const onCancel = jest.fn();
    await act(async () => {
      confirmDialog({ title: 'Tắt micro tất cả', onCancel });
    });
    await wait();

    const close = document.querySelector('.ant-modal-confirm .ant-modal-close');
    expect(close).toBeInTheDocument();
    expect(close?.querySelector('.app-close-icon')).toBeInTheDocument();
    fireEvent.click(close!);
    await wait();
    expect(onCancel).toHaveBeenCalled();
  });

  it('the log-out dialog can be closed with its X', async () => {
    const onCancel = jest.fn();
    render(
      <ConfigProvider modal={modalConfig}>
        <LogoutDialog open onCancel={onCancel} onConfirm={() => {}} />
      </ConfigProvider>,
    );
    await wait();
    fireEvent.click(document.querySelector('.ant-modal-close')!);
    expect(onCancel).toHaveBeenCalled();
  });

  it("the meeting's permissions panel has an X that closes it", async () => {
    render(
      <RoomPermissions settings={{}} onChange={() => Promise.resolve()}>
        <button type="button">Quyền</button>
      </RoomPermissions>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Quyền' }));
    await wait();
    const close = screen.getByRole('button', { name: 'Đóng' });

    fireEvent.click(close);
    await wait();

    expect(
      document.querySelector('.ant-popover:not(.ant-popover-hidden)'),
    ).toBeNull();
  });
});
