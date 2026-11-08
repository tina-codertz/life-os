import { View } from 'react-native';
import { isApiError } from '@/services/api-error';
import { spacing } from '@/theme';
import { Button } from './button';
import { Text } from './text';

export interface ErrorStateProps {
  error?: unknown;
  // Overrides the message derived from `error`.
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

// Shown in place of content that failed to load: never a blank screen (docs/07 §6). The text
// says what happened in plain words; for offline it says so, since retrying won't help yet.
export function ErrorState({ error, message, onRetry, retrying = false }: ErrorStateProps) {
  return (
    <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
      <Text variant="title3" style={{ textAlign: 'center' }} accessibilityRole="alert">
        {message ?? describe(error)}
      </Text>
      {isApiError(error) && error.requestId && (
        // Something a user can quote in a bug report; it finds the exact log line (4.1).
        <Text variant="caption" tone="secondary" selectable>
          Reference: {error.requestId}
        </Text>
      )}
      {onRetry && (
        <Button title="Try again" variant="secondary" loading={retrying} onPress={onRetry} />
      )}
    </View>
  );
}

function describe(error: unknown): string {
  if (isApiError(error, 'NETWORK_ERROR')) return "You're offline. Check your connection.";
  if (isApiError(error, 'TIMEOUT')) return 'Life OS is taking too long to answer.';
  if (isApiError(error) && error.status >= 500) return 'Something went wrong on our side.';
  return "Couldn't load this.";
}
