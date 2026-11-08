import { type ComponentRef, type Ref, useId, useState } from 'react';
import { Pressable, TextInput, type TextInputProps, View } from 'react-native';
import { radius, spacing, typography, useTheme } from '@/theme';
import type { IconName } from './icon';
import { IconTile } from './icon-tile';
import { Text } from './text';

// What a ref to a TextField points at: call .focus() to move to the next field.
export type TextFieldHandle = ComponentRef<typeof TextInput>;

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label: string;
  error?: string | undefined;
  helper?: string | undefined;
  disabled?: boolean;
  // A small icon tile at the start of the field (the design's sign-in fields).
  icon?: IconName;
  ref?: Ref<TextFieldHandle>;
}

// Label above, error (or helper) below. A password field (secureTextEntry) gets a Show/Hide
// button: typing a long passphrase blind on a phone keyboard is how typos happen.
export function TextField({
  label,
  error,
  helper,
  disabled = false,
  secureTextEntry,
  icon,
  ref,
  ...inputProps
}: TextFieldProps) {
  const { colors, shadows } = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const messageId = useId();

  const borderColor = error ? colors.danger.text : focused ? colors.accent.default : 'transparent';

  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="label" tone="label" nativeID={`${messageId}-label`}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: inputProps.multiline ? 'flex-start' : 'center',
          gap: spacing.md,
          minHeight: 58,
          paddingLeft: icon ? 10 : spacing.xs,
          borderRadius: radius.lg,
          borderCurve: 'continuous',
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.bg.surface,
          boxShadow: shadows.sm,
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon && <IconTile icon={icon} tint={colors.tile.lavender} size={40} />}
        <TextInput
          ref={ref}
          {...inputProps}
          editable={!disabled}
          secureTextEntry={secureTextEntry && !revealed}
          accessibilityLabel={label}
          // Screen readers read the error with the field, not only when it first appears.
          accessibilityHint={error ?? helper}
          accessibilityState={{ disabled }}
          placeholderTextColor={colors.text.secondary}
          maxFontSizeMultiplier={2}
          onFocus={(e) => {
            setFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            inputProps.onBlur?.(e);
          }}
          style={{
            ...typography.body,
            flex: 1,
            color: colors.text.primary,
            paddingHorizontal: icon ? 0 : spacing.md,
            paddingVertical: spacing.md,
          }}
        />
        {secureTextEntry && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? `Hide ${label}` : `Show ${label}`}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
            style={{ paddingHorizontal: spacing.md, minHeight: 44, justifyContent: 'center' }}
          >
            <Text variant="callout" tone="accent">
              {revealed ? 'Hide' : 'Show'}
            </Text>
          </Pressable>
        )}
      </View>
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" tone="secondary">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
