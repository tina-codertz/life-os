import { useLocalSearchParams } from 'expo-router';
import { verifyEmail } from '@/features/auth/auth-api';
import { LinkActionScreen } from '@/features/auth/link-action-screen';

// lifeos://verify-email?token=… from the email sent at register (4.6). Outside the auth gate:
// the link works whether or not the app is signed in.
export default function VerifyEmail() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  return (
    <LinkActionScreen
      title="Confirm email"
      token={token}
      action={verifyEmail}
      successMessage="Your email address is confirmed."
    />
  );
}
