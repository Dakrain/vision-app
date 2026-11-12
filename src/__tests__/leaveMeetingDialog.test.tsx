import '@testing-library/jest-dom';
import '../renderer/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { LeaveMeetingDialog } from '../renderer/features/Meeting/components/LeaveMeetingDialog';

// The host's "leave the meeting" dialog: end it for everyone, just leave,
// or change their mind — a Cancel button, not only the X.
describe('LeaveMeetingDialog', () => {
  const pump = () => {
    const props = { onEnd: jest.fn(), onLeave: jest.fn(), onClose: jest.fn() };
    // eslint-disable-next-line react/jsx-props-no-spreading
    render(<LeaveMeetingDialog open {...props} />);
    return props;
  };

  it('end for everyone, leave, cancel — in that order', () => {
    pump();
    const names = screen
      .getAllByRole('button')
      .map((b) => b.textContent)
      .filter(Boolean);
    expect(names).toEqual([
      'Kết thúc cuộc họp cho mọi người',
      'Rời phòng',
      'Hủy',
    ]);
  });

  it('each button does its thing', () => {
    const { onEnd, onLeave, onClose } = pump();
    fireEvent.click(
      screen.getByRole('button', { name: 'Kết thúc cuộc họp cho mọi người' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rời phòng' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onLeave).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
