import { router } from 'expo-router';
import { View } from 'react-native';
import { PlaceholderScreen } from '@/components/placeholder-screen';
import { Button } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { spacing } from '@/theme';

export default function Welcome() {
  const { signIn } = useSession();
  return (
    <PlaceholderScreen
      title="Life OS"
      description="Tasks, habits, goals and your calendar in one place."
    >
      <View style={{ gap: spacing.sm }}>
        <Button title="Create account" onPress={() => router.push('/register')} />
        <Button title="Log in" variant="secondary" onPress={() => router.push('/login')} />
        {__DEV__ && (
          // Development only, until real login (5.5): walk through the gate without the API.
          <>
            <Button
              title="Demo: new user"
              variant="ghost"
              onPress={() => signIn({ onboarded: false })}
            />
            <Button
              title="Demo: returning user"
              variant="ghost"
              onPress={() => signIn({ onboarded: true })}
            />
          </>
        )}
      </View>
    </PlaceholderScreen>
  );
}
