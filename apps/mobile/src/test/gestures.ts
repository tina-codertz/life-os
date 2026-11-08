import { act, fireEvent, screen } from 'expo-router/testing-library';

type Host = ReturnType<typeof screen.getByTestId>;

// Drives a PanResponder like a finger would: touch down, move `dx` sideways in steps, lift.
// PanResponder works out the drag from the event's touch history, so each step carries one.
// Each step says where the finger is now and where it was a moment before (PanResponder adds up
// the difference).
function touchHistory(x: number, y: number, t: number, prevX: number, prevY: number) {
  return {
    numberActiveTouches: 1,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: t,
    touchBank: [
      {
        touchActive: true,
        startPageX: 0,
        startPageY: 0,
        startTimeStamp: 0,
        currentPageX: x,
        currentPageY: y,
        currentTimeStamp: t,
        previousPageX: prevX,
        previousPageY: prevY,
        previousTimeStamp: t - 1,
      },
    ],
  };
}

export async function swipe(element: Host, dx: number, dy = 0): Promise<void> {
  let last = { x: 0, y: 0 };
  const event = (x: number, y: number, t: number) => {
    const e = {
      nativeEvent: { pageX: x, pageY: y, timestamp: t, touches: [], changedTouches: [] },
      touchHistory: touchHistory(x, y, t, last.x, last.y),
    };
    last = { x, y };
    return e;
  };
  const props = element.props as Record<string, ((e: unknown) => unknown) | undefined>;
  await act(async () => {
    // A first small move asks the view whether it wants the gesture: in the capture phase
    // (parents first), then the bubbling one, as React Native does.
    // (Each phase gets its own event: a PanResponder ignores one it has already seen.)
    const wants =
      props['onMoveShouldSetResponderCapture']?.(event(dx / 4, dy / 4, 2)) ||
      props['onMoveShouldSetResponder']?.(event(dx / 4, dy / 4, 2.5));
    if (!wants) return;
    // Granted: the drag is measured from where the finger went down.
    last = { x: 0, y: 0 };
    props['onResponderGrant']?.(event(0, 0, 3));
    for (let i = 1; i <= 4; i += 1) {
      props['onResponderMove']?.(event((dx * i) / 4, (dy * i) / 4, 3 + 2 * i));
    }
    props['onResponderRelease']?.(event(dx, dy, 20));
  });
}

// Gives a view its on-screen size (Jest has no real layout).
export async function layout(element: Host, width: number, height = 72): Promise<void> {
  await fireEvent(element, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width, height } } });
}
