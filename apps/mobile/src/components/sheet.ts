// Sheets are native form sheets (UISheetPresentationController / Material bottom sheet),
// presented as routes, never a hand-built overlay ("The Web Modal", expo-design-system).
// Use on a Stack.Screen: <Stack.Screen name="task-form" options={sheetOptions()} />
// Detents are fractions of the screen height; the user can drag between them.
export function sheetOptions(detents: number[] = [0.5, 1]) {
  return {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetAllowedDetents: detents,
    sheetCornerRadius: 24,
    headerShown: false,
  };
}
