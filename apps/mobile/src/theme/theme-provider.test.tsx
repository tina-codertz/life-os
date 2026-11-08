import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { renderWithTheme } from '@/test/render';
import { darkTheme, lightTheme, useTheme, useThemePreference } from '@/theme';

function Probe() {
  const theme = useTheme();
  const { setPreference } = useThemePreference();
  return (
    <Text testID="probe" onPress={() => setPreference(theme.scheme === 'dark' ? 'LIGHT' : 'DARK')}>
      {theme.scheme}
    </Text>
  );
}

describe('ThemeProvider', () => {
  it.each([
    ['DARK', 'dark'],
    ['LIGHT', 'light'],
  ] as const)('preference %s gives the %s theme', async (preference, scheme) => {
    await renderWithTheme(<Probe />, preference);
    expect(screen.getByTestId('probe')).toHaveTextContent(scheme);
  });

  it('switches theme when the preference changes', async () => {
    await renderWithTheme(<Probe />, 'DARK');
    await fireEvent.press(screen.getByTestId('probe'));
    expect(screen.getByTestId('probe')).toHaveTextContent('light');
  });

  it('dark and light themes have the same shape', async () => {
    expect(Object.keys(lightTheme.colors)).toEqual(Object.keys(darkTheme.colors));
  });

  it('useTheme outside the provider is a clear error', async () => {
    // React logs the thrown error too; keep the test output clean.
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(render(<Probe />)).rejects.toThrow(
      'useTheme() must be used inside <ThemeProvider>',
    );
    spy.mockRestore();
  });
});
