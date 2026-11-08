import { act, fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/services/api-error';
import { renderWithTheme } from '@/test/render';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { Skeleton, SkeletonGroup } from './skeleton';

describe('EmptyState', () => {
  it('shows the title, description and a working action', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <EmptyState
        title="No habits yet"
        description="Small daily actions add up."
        action={{ label: 'Add your first habit', onPress }}
      />,
    );
    expect(screen.getByText('No habits yet')).toBeOnTheScreen();
    expect(screen.getByText('Small daily actions add up.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Add your first habit' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('works without an action', async () => {
    await renderWithTheme(<EmptyState title="Nothing here" />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorState', () => {
  it.each([
    ['offline', new ApiError(0, 'NETWORK_ERROR', 'x'), "You're offline. Check your connection."],
    ['a timeout', new ApiError(0, 'TIMEOUT', 'x'), 'Life OS is taking too long to answer.'],
    [
      'a server error',
      new ApiError(503, 'SERVICE_UNAVAILABLE', 'x'),
      'Something went wrong on our side.',
    ],
    ['anything else', new Error('boom'), "Couldn't load this."],
  ])('explains %s in plain words', async (_case, error, text) => {
    await renderWithTheme(<ErrorState error={error} />);
    expect(screen.getByRole('alert')).toHaveTextContent(text);
  });

  it('shows the request ID to quote, and retries', async () => {
    const onRetry = jest.fn();
    await renderWithTheme(
      <ErrorState
        error={new ApiError(500, 'INTERNAL_ERROR', 'x', { requestId: 'req-42' })}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText('Reference: req-42')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('a custom message wins', async () => {
    await renderWithTheme(<ErrorState message="Couldn't load your habits." />);
    expect(screen.getByRole('alert')).toHaveTextContent("Couldn't load your habits.");
  });
});

// Skeletons are hidden from screen readers on purpose, so queries must include hidden elements.
const hidden = { includeHiddenElements: true };

describe('Skeleton', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('appears only after 150 ms, so fast loads do not flicker', async () => {
    await renderWithTheme(<Skeleton />);
    expect(screen.queryByTestId('skeleton', hidden)).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(149);
    });
    expect(screen.queryByTestId('skeleton', hidden)).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByTestId('skeleton', hidden)).toBeOnTheScreen();
  });

  it('is hidden from screen readers; the group is announced as loading', async () => {
    await renderWithTheme(
      <SkeletonGroup label="Loading your account">
        <Skeleton delayMs={0} />
      </SkeletonGroup>,
    );
    expect(screen.getByTestId('skeleton', { includeHiddenElements: true })).not.toBeVisible();
    expect(screen.getByLabelText('Loading your account')).toBeBusy();
  });
});
