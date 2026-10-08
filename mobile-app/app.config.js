const fs = require('node:fs');
const path = require('node:path');
const plist = require('@expo/plist').default;

const GOOGLE_PLUGIN = 'react-native-nitro-google-signin';
const SAFE_BOTTOM_SHEET_PLUGIN = './plugins/with-expo-ui-bottom-sheet-safe-top';

module.exports = ({ config }) => {
  const iosGoogleServicesFile = process.env.GOOGLE_IOS_SERVICES_FILE?.trim() || './GoogleServices-Info.plist';
  const androidGoogleServicesFile = process.env.GOOGLE_ANDROID_SERVICES_FILE?.trim() || './google-services.json';
  const iosGoogleServicesPath = path.resolve(__dirname, iosGoogleServicesFile);
  const androidGoogleServicesPath = path.resolve(__dirname, androidGoogleServicesFile);
  const hasIosConfig = fs.existsSync(iosGoogleServicesPath);
  const hasAndroidConfig = fs.existsSync(androidGoogleServicesPath);
  let googleSignIn = { nativeConfigReady: false };

  if (hasIosConfig && hasAndroidConfig) {
    const iosGoogleConfig = plist.parse(fs.readFileSync(iosGoogleServicesPath, 'utf8'));
    const androidGoogleConfig = JSON.parse(fs.readFileSync(androidGoogleServicesPath, 'utf8'));
    const androidPackage = config.android?.package;
    const androidClient = androidGoogleConfig.client?.find(
      (client) => client.client_info?.android_client_info?.package_name === androidPackage,
    );
    const webClientId = androidClient?.oauth_client?.find((client) => client.client_type === 3)?.client_id;

    if (
      !iosGoogleConfig.CLIENT_ID ||
      !iosGoogleConfig.REVERSED_CLIENT_ID ||
      iosGoogleConfig.BUNDLE_ID !== config.ios?.bundleIdentifier ||
      !webClientId
    ) {
      throw new Error('Google Services config must match this iOS bundle ID and include iOS OAuth IDs plus an Android Web OAuth client for this app package.');
    }

    googleSignIn = {
      nativeConfigReady: true,
      iosClientId: iosGoogleConfig.CLIENT_ID,
      webClientId,
    };
  }

  const plugins = (config.plugins ?? []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return name !== GOOGLE_PLUGIN && name !== SAFE_BOTTOM_SHEET_PLUGIN;
  });

  plugins.push(SAFE_BOTTOM_SHEET_PLUGIN);
  if (googleSignIn.nativeConfigReady) {
    plugins.push(GOOGLE_PLUGIN);
  }

  return {
    ...config,
    ios: googleSignIn.nativeConfigReady ? { ...config.ios, googleServicesFile: iosGoogleServicesFile } : config.ios,
    android: googleSignIn.nativeConfigReady ? { ...config.android, googleServicesFile: androidGoogleServicesFile } : config.android,
    plugins,
    extra: {
      ...config.extra,
      googleSignIn,
      posthog: {
        projectToken: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim(),
        host: process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim(),
      },
    },
  };
};
