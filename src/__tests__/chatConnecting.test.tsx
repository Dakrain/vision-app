import '@testing-library/jest-dom';
import '../renderer/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { ChatConnecting } from '../renderer/features/Home/pages/Chat/components/ChatConnecting';
import { retryDelayMs } from '../renderer/shared/utils/backoff';

describe('ChatConnecting', () => {
  it('connecting: a spinner and the message, no retry button', () => {
    const { container } = render(
      <ChatConnecting status="connecting" onRetry={() => {}} />,
    );
    expect(screen.getByText('Đang kết nối trò chuyện…')).toBeInTheDocument();
    expect(container.querySelector('.ant-spin')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('failed: an error and a retry button that retries', () => {
    const onRetry = jest.fn();
    render(<ChatConnecting status="failed" onRetry={onRetry} />);
    expect(
      screen.getByText('Không kết nối được trò chuyện'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

describe('retryDelayMs', () => {
  it('backs off and caps', () => {
    expect([0, 1, 2, 3, 10].map(retryDelayMs)).toEqual([
      2000, 4000, 8000, 16000, 30000,
    ]);
  });
});
