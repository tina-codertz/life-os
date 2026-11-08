import { apiBaseUrl } from '@/services/config';
import { createAuthStore } from './auth-store';
import { secureSessionStorage } from './session-storage';

// The app's one auth store, and with it the one HTTP client: `authStore.getState().http`.
export const authStore = createAuthStore({ storage: secureSessionStorage, baseUrl: apiBaseUrl });

export const api = () => authStore.getState().http;
