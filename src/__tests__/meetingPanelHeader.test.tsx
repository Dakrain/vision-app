import '@testing-library/jest-dom';
import '../renderer/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { PanelHeader } from '../renderer/features/Meeting/components/PanelHeader';

// The meeting's side panels (participants, chat) closed only by pressing
// their toolbar button again, which many people didn't know: a close
// button at the panel's top right.
describe('PanelHeader', () => {
  it('shows the title and a close button that closes the panel', () => {
    const onClose = jest.fn();
    render(<PanelHeader title="Người tham dự" onClose={onClose} />);

    expect(screen.getByText('Người tham dự')).toBeInTheDocument();
    const close = screen.getByRole('button', { name: 'Đóng' });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
