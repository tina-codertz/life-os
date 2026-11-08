import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { darkColors, lightTheme } from '@/theme';
import { Text } from './text';
import { Card } from './card';

describe('Card', () => {
  it('renders its children on the surface colour, not as a button', async () => {
    await renderWithTheme(
      <Card testID="card">
        <Text>Inside</Text>
      </Card>,
    );
    expect(screen.getByText('Inside')).toBeOnTheScreen();
    expect(screen.getByTestId('card')).toHaveStyle({ backgroundColor: darkColors.bg.surface });
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('becomes a labelled button when it has onPress', async () => {
    const onPress = jest.fn();
    await renderWithTheme(
      <Card onPress={onPress} accessibilityLabel="Open goal">
        <Text>Goal</Text>
      </Card>,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Open goal' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('uses a stronger shadow for elevated cards in light mode', async () => {
    await renderWithTheme(
      <Card variant="elevated" testID="card">
        <Text>x</Text>
      </Card>,
      'LIGHT',
    );
    expect(screen.getByTestId('card')).toHaveStyle({ boxShadow: lightTheme.shadows.lg });
  });
});
