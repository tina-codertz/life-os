import { darkColors, lightColors, type ThemeColors } from './colors';

// WCAG 2.x contrast ratio. AA needs 4.5:1 for normal text, 3:1 for large text and UI shapes.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].toSorted((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Every text-on-background pair the components actually use.
function textPairs(c: ThemeColors): [string, string, string][] {
  const backgrounds = {
    canvas: c.bg.canvas,
    surface: c.bg.surface,
    elevated: c.bg.elevated,
    subtle: c.bg.subtle,
  };
  const pairs: [string, string, string][] = [];
  for (const [bgName, bg] of Object.entries(backgrounds)) {
    pairs.push(
      [`text.primary on ${bgName}`, c.text.primary, bg],
      [`text.secondary on ${bgName}`, c.text.secondary, bg],
      [`accent.default on ${bgName}`, c.accent.default, bg],
      [`danger.text on ${bgName}`, c.danger.text, bg],
    );
  }
  pairs.push(
    ['button label on accent.fill', c.text.onAccent, c.accent.fill],
    ['button label on danger.fill', c.text.onAccent, c.danger.fill],
  );
  return pairs;
}

describe.each([
  ['dark', darkColors],
  ['light', lightColors],
])('%s theme contrast (WCAG AA)', (_name, colors) => {
  it.each(textPairs(colors))('%s ≥ 4.5:1', (_pair, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('success colour is readable on surfaces', () => {
    expect(contrast(colors.success.default, colors.bg.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

it('catches a failing pair (the original dark danger fill)', () => {
  expect(contrast('#FFFFFF', '#D9475F')).toBeLessThan(4.5);
});
