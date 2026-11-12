import '@testing-library/jest-dom';
import '../renderer/i18n';
import { act } from '@testing-library/react';
import { Modal } from 'antd';
import { configureStaticDialogs } from '../renderer/theme';

// Modal.confirm (and message / notification) render outside the app's
// ConfigProvider: they came out in antd's default blue and font, not the
// app's red. configureStaticDialogs gives them the app's theme.
const styles = () =>
  [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');

describe('static dialogs', () => {
  it('use the app colours, not antd blue', async () => {
    configureStaticDialogs();
    await act(async () => {
      Modal.confirm({
        title: 'Cần cấp quyền',
        okText: 'Mở',
        cancelText: 'Để sau',
      });
    });
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    });

    expect(document.querySelector('.ant-modal-confirm')).toBeInTheDocument();
    const css = styles();
    const primaryRules = css
      .split('}')
      .filter((rule) => rule.includes('.ant-btn-color-primary'));
    expect(primaryRules.length).toBeGreaterThan(0);
    expect(primaryRules.join('}')).toContain('#ff4d4f');
    expect(primaryRules.join('}')).not.toContain('#1677ff');
    Modal.destroyAll();
  });
});
