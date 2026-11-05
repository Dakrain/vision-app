import '@testing-library/jest-dom';
import '../renderer/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { LoadFailed } from '../renderer/shared/components/LoadFailed/LoadFailed';

describe('LoadFailed', () => {
  it('shows the message and retries', () => {
    const onRetry = jest.fn();
    render(<LoadFailed message="Không tải được danh bạ" onRetry={onRetry} />);
    expect(screen.getByText('Không tải được danh bạ')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
