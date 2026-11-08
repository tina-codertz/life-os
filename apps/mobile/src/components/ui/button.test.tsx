import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { darkColors, lightColors } from '@/theme';
import { Button } from './button';

describe('Button', () => {
  it('is announced as a button with its title and calls onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button title="Save" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('when disabled: marked disabled and does nothing', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button title="Save" onPress={onPress} disabled />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('when loading: busy, disabled, spinner instead of the title, label kept', async () => {
    const onPress = jest.fn();
    await renderWithTheme(<Button title="Save" onPress={onPress} loading />);

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeBusy();
    expect(button).toBeDisabled();
    expect(screen.queryByText('Save')).toBeNull();
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it.each([
    ['primary', 'DARK', darkColors.accent.fill],
    ['destructive', 'DARK', darkColors.danger.fill],
    ['primary', 'LIGHT', lightColors.accent.fill],
  ] as const)('%s variant in %s uses the theme fill', async (variant, theme, fill) => {
    await renderWithTheme(<Button title="Go" variant={variant} />, theme);
    expect(screen.getByRole('button', { name: 'Go' })).toHaveStyle({ backgroundColor: fill });
  });

  it('is at least 44 pt tall at the default size', async () => {
    await renderWithTheme(<Button title="Tall" />);
    expect(screen.getByRole('button', { name: 'Tall' })).toHaveStyle({ minHeight: 44 });
  });
});
