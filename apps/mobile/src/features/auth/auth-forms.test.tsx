import type { AuthResult, PublicUser } from '@life-os/shared';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';
import { StrictMode } from 'react';
import { apiError, calls, resetMockApi, routes } from '@/test/mock-auth-instance';
import { authStore } from './auth-instance';

jest.mock('./auth-instance', () => jest.requireActual('@/test/mock-auth-instance'));

const USER: PublicUser = {
  id: 'u1',
  email: 'tina@example.com',
  displayName: 'Tina',
  emailVerifiedAt: null,
  onboardingCompletedAt: '2026-11-08T10:00:00.000Z',
  createdAt: '2026-11-08T09:00:00.000Z',
};
const SIGNED_IN: AuthResult = { user: USER, accessToken: 'access-1', refreshToken: 'refresh-1' };

const field = (label: string) => screen.getByLabelText(label);
const type = (label: string, text: string) => fireEvent.changeText(field(label), text);
const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const sent = (route: string) => calls.filter((c) => c.route === route);

const openLogin = () => renderRouter('src/app', { initialUrl: '/login' });
const openRegister = () => renderRouter('src/app', { initialUrl: '/register' });

beforeEach(() => resetMockApi());

describe('Log in', () => {
  const open = openLogin;

  it('shows the shared schema messages and sends nothing while invalid', async () => {
    await open();
    await press('Log in');
    expect(await screen.findByText('Enter a valid email address.')).toBeOnTheScreen();
    expect(screen.getByText('Enter your password.')).toBeOnTheScreen();
    expect(sent('POST /auth/login')).toHaveLength(0);
  });

  it('sends the normalised email, signs in, and the gate opens the app', async () => {
    routes['POST /auth/login'] = () => ({ status: 200, body: { data: SIGNED_IN } });
    const router = await open();

    await type('Email', '  Tina@Example.com ');
    await type('Password', 'correct horse battery');
    await press('Log in');

    await waitFor(() => expect(router.getPathname()).toBe('/today'));
    expect(sent('POST /auth/login')[0]?.body).toMatchObject({
      email: 'tina@example.com',
      password: 'correct horse battery',
    });
    expect(authStore.getState()).toMatchObject({ status: 'signedIn', accessToken: 'access-1' });
  });

  it('shows a wrong password above the form and stays put', async () => {
    routes['POST /auth/login'] = () => ({
      status: 401,
      body: apiError('INVALID_CREDENTIALS', 'Email or password is incorrect.'),
    });
    const router = await open();

    await type('Email', 'tina@example.com');
    await type('Password', 'not my password');
    await press('Log in');

    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(router.getPathname()).toBe('/login');
    expect(authStore.getState().status).toBe('signedOut');
  });

  it('can reveal the password', async () => {
    await open();
    expect(field('Password').props.secureTextEntry).toBe(true);
    await press('Show Password');
    expect(field('Password').props.secureTextEntry).toBe(false);
  });
});

describe('Create account', () => {
  const open = openRegister;

  it('rejects a common password with the shared message', async () => {
    await open();
    await type('Name', 'Tina');
    await type('Email', 'tina@example.com');
    await type('Password', 'password123');
    await press('Create account');

    expect(await screen.findByText(/too common/)).toBeOnTheScreen();
    expect(sent('POST /auth/register')).toHaveLength(0);
  });

  it('puts EMAIL_TAKEN on the email field', async () => {
    routes['POST /auth/register'] = () => ({
      status: 409,
      body: apiError('EMAIL_TAKEN', 'An account with this email already exists.'),
    });
    await open();
    await type('Name', 'Tina');
    await type('Email', 'tina@example.com');
    await type('Password', 'correct horse battery');
    await press('Create account');

    expect(await screen.findByText(/already exists\. Log in instead\?/)).toBeOnTheScreen();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('puts server field errors on their fields', async () => {
    routes['POST /auth/register'] = () => ({
      status: 400,
      body: apiError('VALIDATION_FAILED', 'Some fields are invalid.', [
        { field: 'displayName', message: 'Use at most 80 characters.' },
      ]),
    });
    await open();
    await type('Name', 'Tina');
    await type('Email', 'tina@example.com');
    await type('Password', 'correct horse battery');
    await press('Create account');

    expect(await screen.findByText('Use at most 80 characters.')).toBeOnTheScreen();
  });

  it('signs in a new user and sends them to onboarding', async () => {
    routes['POST /auth/register'] = () => ({
      status: 201,
      body: { data: { ...SIGNED_IN, user: { ...USER, onboardingCompletedAt: null } } },
    });
    const router = await open();
    await type('Name', 'Tina');
    await type('Email', 'tina@example.com');
    await type('Password', 'correct horse battery');
    await press('Create account');

    await waitFor(() => expect(router.getPathname()).toBe('/profile'));
  });
});

describe('Forgot password', () => {
  it('always shows the same confirmation (never reveals whether the account exists)', async () => {
    routes['POST /auth/forgot-password'] = () => ({ status: 204 });
    await renderRouter('src/app', { initialUrl: '/forgot-password' });

    await type('Email', 'Nobody@Example.com');
    await press('Send link');

    expect(
      await screen.findByText(/If nobody@example\.com has a Life OS account/),
    ).toBeOnTheScreen();
    expect(sent('POST /auth/forgot-password')[0]?.body).toEqual({ email: 'nobody@example.com' });
  });
});

describe('Links from emails', () => {
  it('reset password: saves the new password with the token, then offers log in', async () => {
    routes['POST /auth/reset-password'] = () => ({ status: 204 });
    await renderRouter('src/app', { initialUrl: '/reset-password?token=tok-123' });

    await type('New password', 'a brand new passphrase');
    await press('Save password');

    expect(await screen.findByText(/logged out everywhere/)).toBeOnTheScreen();
    expect(sent('POST /auth/reset-password')[0]?.body).toEqual({
      token: 'tok-123',
      newPassword: 'a brand new passphrase',
    });
  });

  it('reset password: an expired link says so', async () => {
    routes['POST /auth/reset-password'] = () => ({
      status: 400,
      body: apiError('INVALID_LINK', 'This link is invalid or has expired. Request a new one.'),
    });
    await renderRouter('src/app', { initialUrl: '/reset-password?token=old' });
    await type('New password', 'a brand new passphrase');
    await press('Save password');

    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/);
  });

  it('verify email: works signed out, and calls the API exactly once', async () => {
    routes['POST /auth/verify-email'] = () => ({ status: 204 });
    // StrictMode runs effects twice in development, the case the run-once guard is for.
    await renderRouter('src/app', { initialUrl: '/verify-email?token=tok-v', wrapper: StrictMode });

    expect(await screen.findByText('Your email address is confirmed.')).toBeOnTheScreen();
    expect(sent('POST /auth/verify-email')).toEqual([
      { route: 'POST /auth/verify-email', body: { token: 'tok-v' } },
    ]);
  });

  it('confirm email change: refreshes the signed-in user afterwards', async () => {
    const changed = { ...USER, email: 'tina.new@example.org' };
    routes['POST /auth/confirm-email-change'] = () => ({ status: 204 });
    routes['GET /users/me'] = () => ({ status: 200, body: { data: { user: changed } } });
    await authStore.getState().signIn(SIGNED_IN);

    await renderRouter('src/app', { initialUrl: '/confirm-email-change?token=tok-c' });

    expect(await screen.findByText(/now uses this email address/)).toBeOnTheScreen();
    expect(authStore.getState().user?.email).toBe('tina.new@example.org');
  });

  it('a link without a token explains itself', async () => {
    await renderRouter('src/app', { initialUrl: '/verify-email' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/incomplete/);
  });
});
