import { screen } from '@testing-library/react-native';
import { renderWithTheme } from '@/test/render';
import { darkColors, lightColors, typography } from '@/theme';
import { Text } from './text';

describe('Text', () => {
  it('uses the body style and primary colour by default', async () => {
    await renderWithTheme(<Text>Hello</Text>);
    expect(screen.getByText('Hello')).toHaveStyle({
      fontSize: typography.body.fontSize,
      color: darkColors.text.primary,
    });
  });

  it('applies the variant and tone from the active theme', async () => {
    await renderWithTheme(
      <Text variant="title2" tone="secondary">
        Section
      </Text>,
      'LIGHT',
    );
    expect(screen.getByText('Section')).toHaveStyle({
      fontSize: typography.title2.fontSize,
      color: lightColors.text.secondary,
    });
  });

  it('lets callers add layout styles', async () => {
    await renderWithTheme(<Text style={{ marginTop: 8 }}>Spaced</Text>);
    expect(screen.getByText('Spaced')).toHaveStyle({ marginTop: 8 });
  });

  it('allows font scaling up to 2×', async () => {
    await renderWithTheme(<Text>Scaled</Text>);
    expect(screen.getByText('Scaled').props.maxFontSizeMultiplier).toBe(2);
  });
});
