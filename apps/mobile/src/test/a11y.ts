import { screen } from 'expo-router/testing-library';

// Accessibility audit helpers for screen tests (week 13 a11y pass).
// The roles a screen reader announces as something to act on.
const INTERACTIVE = ['button', 'checkbox', 'radio', 'tab', 'switch', 'link', 'adjustable'];

type Host = ReturnType<typeof screen.getByRole>;

// What a screen reader would read for an element: its label, or else its text.
function accessibleName(el: Host): string {
  const label = el.props.accessibilityLabel;
  if (typeof label === 'string') return label.trim();
  const text: string[] = [];
  const walk = (node: Host | string) => {
    if (typeof node === 'string') {
      text.push(node);
      return;
    }
    if (node.props.accessibilityElementsHidden) return;
    for (const child of node.children) walk(child);
  };
  walk(el);
  return text.join('').trim();
}

// Everything on the current screen a user can act on that a screen reader can't name.
// (Hidden screens underneath, e.g. behind a sheet, are skipped like a screen reader does.)
export function unnamedControls(): string[] {
  return INTERACTIVE.flatMap((role) =>
    screen
      .queryAllByRole(role)
      .filter((el) => accessibleName(el) === '')
      .map((el) => `${role}${el.props.testID ? ` (${String(el.props.testID)})` : ''}`),
  );
}
