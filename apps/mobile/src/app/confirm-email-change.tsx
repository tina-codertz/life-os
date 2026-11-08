import { useLocalSearchParams } from 'expo-router';
import { confirmEmailChange } from '@/features/auth/auth-api';
import { LinkActionScreen } from '@/features/auth/link-action-screen';

// lifeos://confirm-email-change?token=… sent to the new address (4.9).
export default function ConfirmEmailChange() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return (
    <LinkActionScreen
      title="Confirm new email"
      token={token}
      action={confirmEmailChange}
      successMessage="Your account now uses this email address. Use it next time you log in."
    />
  );
}
