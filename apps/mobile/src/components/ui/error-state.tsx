import { View } from 'react-native';
import { isApiError } from '@/services/api-error';
import { spacing, useTheme } from '@/theme';
import { Button } from './button';
import { IconTile } from './icon-tile';
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
  const { colors } = useTheme();
  return (
    <View style={{ gap: spacing.md, paddingVertical: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <IconTile
          icon="warning"
          tint={colors.danger.soft}
          iconColor={colors.danger.text}
          size={48}
        />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text variant="title3" accessibilityRole="alert">
            {message ?? describe(error)}
          </Text>
          {isApiError(error) && error.requestId && (
            // Something a user can quote in a bug report; it finds the exact log line (4.1).
            <Text variant="caption" tone="secondary" selectable>
              Reference: {error.requestId}
            </Text>
          )}
        </View>
      </View>
      {onRetry && (
        <Button
          title="Try again"
          variant="secondary"
          icon="refresh"
          loading={retrying}
          onPress={onRetry}
        />
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
