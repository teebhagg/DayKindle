import * as Crypto from 'expo-crypto';
import Constants from 'expo-constants';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { AppleAuthenticationCredential } from 'expo-apple-authentication';
import { Platform } from 'react-native';
import type { Database } from './database.types';
import { supabaseConfigured } from './supabase-client';

export class AccountSetupError extends Error {
  readonly code: string;

  constructor(message: string, code = 'ACCOUNT_SETUP_ERROR') {
    super(message);
    this.name = 'AccountSetupError';
    this.code = code;
  }
}

function requireConfigured() {
  if (!supabaseConfigured) {
    throw new AccountSetupError('Cloud sign-in is not configured on this build. Continue as a guest for now.', 'NOT_CONFIGURED');
  }
}

export async function signInWithGoogle(client: SupabaseClient<Database>): Promise<User | null> {
  requireConfigured();
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    throw new AccountSetupError('Native Google sign-in is available on iPhone, iPad, and Android.', 'GOOGLE_UNAVAILABLE');
  }

  const googleConfig = Constants.expoConfig?.extra?.googleSignIn;
  if (googleConfig?.nativeConfigReady !== true || !googleConfig.webClientId || !googleConfig.iosClientId) {
    throw new AccountSetupError('Google sign-in needs GoogleServices-Info.plist and google-services.json in the app folder, followed by a native rebuild.', 'GOOGLE_NOT_CONFIGURED');
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  const { GoogleOneTapSignIn, isCancelledResponse, isSuccessResponse } = await import('react-native-nitro-google-signin');
  GoogleOneTapSignIn.configure({
    webClientId: googleConfig.webClientId,
    iosClientId: googleConfig.iosClientId,
    nonce: hashedNonce,
  });
  await GoogleOneTapSignIn.checkPlayServices();

  const response = await GoogleOneTapSignIn.presentExplicitSignIn();
  if (isCancelledResponse(response)) return null;
  if (!isSuccessResponse(response) || !response.data.idToken) {
    throw new AccountSetupError('Google sign-in did not return an identity token.', 'GOOGLE_TOKEN_MISSING');
  }

  const { data, error } = await client.auth.signInWithIdToken({
    provider: 'google',
    token: response.data.idToken,
    nonce: rawNonce,
  });
  if (error) throw new AccountSetupError(error.message, 'GOOGLE_SIGN_IN_FAILED');
  return data.user;
}

export async function signInWithApple(client: SupabaseClient<Database>): Promise<User | null> {
  requireConfigured();
  if (Platform.OS !== 'ios') throw new AccountSetupError('Sign in with Apple is available on iPhone and iPad.', 'APPLE_UNAVAILABLE');
  const AppleAuthentication = await import('expo-apple-authentication');
  if (!(await AppleAuthentication.isAvailableAsync())) {
    throw new AccountSetupError('Sign in with Apple is not available on this device.', 'APPLE_UNAVAILABLE');
  }

  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({ nonce: hashedNonce });
  } catch (error) {
    const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
    if (code === 'ERR_REQUEST_CANCELED') return null;
    throw error;
  }
  if (!credential.identityToken) throw new AccountSetupError('Apple did not return an identity token.', 'APPLE_TOKEN_MISSING');

  const { data, error } = await client.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw new AccountSetupError(error.message, 'APPLE_SIGN_IN_FAILED');

  if (credential.fullName) {
    const fullName = [credential.fullName.givenName, credential.fullName.middleName, credential.fullName.familyName]
      .filter((part): part is string => Boolean(part?.trim()))
      .join(' ');
    if (fullName) await client.auth.updateUser({ data: { full_name: fullName } });
  }
  return data.user;
}
