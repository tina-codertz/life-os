import type {
  AuthResult,
  ForgotPasswordInput,
  LoginInput,
  PublicUser,
  RegisterInput,
  ResetPasswordInput,
} from '@life-os/shared';
import * as Device from 'expo-device';
import { api } from './auth-instance';

// The auth endpoints (docs/06), typed with the shared schemas' types. Login and register
// name the device, so a future "where you're logged in" list can show it.
const deviceName = () => Device.modelName ?? undefined;

export function login(input: Omit<LoginInput, 'deviceName'>): Promise<AuthResult> {
  return api().post<AuthResult>(
    '/auth/login',
    { ...input, deviceName: deviceName() },
    { auth: false },
  );
}

export function register(input: Omit<RegisterInput, 'deviceName'>): Promise<AuthResult> {
  return api().post<AuthResult>(
    '/auth/register',
    { ...input, deviceName: deviceName() },
    { auth: false },
  );
}

export function requestPasswordReset(input: ForgotPasswordInput): Promise<void> {
  return api().post<void>('/auth/forgot-password', input, { auth: false });
}

export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return api().post<void>('/auth/reset-password', input, { auth: false });
}

export function verifyEmail(token: string): Promise<void> {
  return api().post<void>('/auth/verify-email', { token }, { auth: false });
}

export function confirmEmailChange(token: string): Promise<void> {
  return api().post<void>('/auth/confirm-email-change', { token }, { auth: false });
}

export async function fetchMe(): Promise<PublicUser> {
  return (await api().get<{ user: PublicUser }>('/users/me')).user;
}
