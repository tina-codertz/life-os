import { act, fireEvent, screen } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { Button } from '@/components/ui/button';
import { renderWithTheme } from '@/test/render';
import { TOAST_DURATION_MS, ToastProvider, type ToastOptions, useToast } from './toast';

function Trigger({ options, label = 'show' }: { options: ToastOptions; label?: string }) {
  const toast = useToast();
  return <Button title={label} onPress={() => toast(options)} />;
}

const show = (label = 'show') => fireEvent.press(screen.getByRole('button', { name: label }));

describe('Toast', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the message, announces it to screen readers, and goes away after 5 s', async () => {
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    await renderWithTheme(
      <ToastProvider>
        <Trigger options={{ message: 'Task deleted' }} />
      </ToastProvider>,
    );
    await show();
    expect(screen.getByText('Task deleted')).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith('Task deleted');

    await act(async () => {
      jest.advanceTimersByTime(TOAST_DURATION_MS);
    });
    expect(screen.queryByText('Task deleted')).toBeNull();
    announce.mockRestore();
  });

  it('runs the action (e.g. Undo) and closes', async () => {
    const undo = jest.fn();
    await renderWithTheme(
      <ToastProvider>
        <Trigger options={{ message: 'Task deleted', action: { label: 'Undo', onPress: undo } }} />
      </ToastProvider>,
    );
    await show();
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(undo).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Task deleted')).toBeNull();
  });

  it('a new toast replaces the old one and gets its own full time', async () => {
    await renderWithTheme(
      <ToastProvider>
        <Trigger options={{ message: 'First' }} label="first" />
        <Trigger options={{ message: 'Second' }} label="second" />
      </ToastProvider>,
    );
    await show('first');
    await act(async () => {
      jest.advanceTimersByTime(4000);
    });
    await show('second');
    expect(screen.queryByText('First')).toBeNull();
    await act(async () => {
      jest.advanceTimersByTime(4000); // 8 s after the first, 4 s after the second
    });
    expect(screen.getByText('Second')).toBeOnTheScreen();
  });

  it('useToast outside the provider is a clear error', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderWithTheme(<Trigger options={{ message: 'x' }} />)).rejects.toThrow(
      'useToast() must be used inside <ToastProvider>',
    );
    spy.mockRestore();
  });
});
