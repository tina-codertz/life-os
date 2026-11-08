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
  const pairs: [string, string, string][] = [];
  // Screens, cards and sheets: all text colours.
  const backgrounds = { canvas: c.bg.canvas, surface: c.bg.surface, elevated: c.bg.elevated };
  for (const [bgName, bg] of Object.entries(backgrounds)) {
    pairs.push(
      [`text.primary on ${bgName}`, c.text.primary, bg],
      [`text.secondary on ${bgName}`, c.text.secondary, bg],
      [`text.label on ${bgName}`, c.text.label, bg],
      [`accent.default on ${bgName}`, c.accent.default, bg],
      [`danger.text on ${bgName}`, c.danger.text, bg],
      [`success.default on ${bgName}`, c.success.default, bg],
    );
  }
  // Pastel tiles and unselected chips: primary and label text only (secondary is too light).
  const tiles = { ...c.tile, subtle: c.bg.subtle };
  for (const [name, bg] of Object.entries(tiles)) {
    pairs.push(
      [`text.primary on tile.${name}`, c.text.primary, bg],
      [`text.label on tile.${name}`, c.text.label, bg],
    );
  }
  for (const [name, bg] of Object.entries(c.categoryTile)) {
    pairs.push([`text.primary on categoryTile.${name}`, c.text.primary, bg]);
  }
  pairs.push(
    ['ink button label', c.ink.text, c.ink.fill],
    ['label on accent.fill (hero)', c.text.onAccent, c.accent.fill],
    ['label on accent.fillEnd (hero)', c.text.onAccent, c.accent.fillEnd],
    ['label on danger.fill', c.text.onAccent, c.danger.fill],
    ['accent.onSoft on accent.soft (Medium badge)', c.accent.onSoft, c.accent.soft],
    ['danger.text on danger.soft (High badge)', c.danger.text, c.danger.soft],
    ['reward.text on reward.fill', c.reward.text, c.reward.fill],
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

  it.each(Object.entries(colors.category))(
    'category %s dot is visible (≥ 3:1) on every background',
    (_category, color) => {
      for (const bg of [colors.bg.canvas, colors.bg.surface, colors.bg.elevated]) {
        expect(contrast(color, bg)).toBeGreaterThanOrEqual(3);
      }
    },
  );
});

it('catches a failing pair (the design’s muted grey on a chip)', () => {
  expect(contrast('#6B6F7B', '#ECEEF3')).toBeLessThan(4.5);
});
