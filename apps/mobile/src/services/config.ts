import Constants from 'expo-constants';

const API_PORT = 3000;

// Where the API lives. EXPO_PUBLIC_API_URL wins when set (staging, production builds; it's
// baked into the app, so it must never hold a secret). In development we reuse the host the
// app was loaded from (Metro, e.g. 192.168.1.20:8081), so a real phone on the same Wi-Fi
// reaches the API on your Mac without configuration. "localhost" would mean the phone itself.
export function apiBaseUrl(): string {
  const fromEnv = process.env['EXPO_PUBLIC_API_URL'];
  if (fromEnv) return fromEnv.replace(/\/$/, '');

  const devHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && devHost) return `http://${devHost}:${API_PORT}`;

  throw new Error('EXPO_PUBLIC_API_URL is not set for this build.');
}
