# Android debug signing

The local `expo run:android` build can use DayKindle's EAS Android keystore so Google Sign-In sees the same app signing certificate as the EAS build.

## Setup

1. From `mobile-app`, run `eas credentials -p android` and choose the relevant build profile.
2. Choose **credentials.json: Upload/Download credentials**, then **Download credentials from EAS to credentials.json**.
3. Keep `credentials.json` and the downloaded keystore local. Both are ignored by Git.
4. Run `npx expo prebuild --platform android` when first setting up the plugin or after changing signing credentials. Then build with `npx expo run:android`.

The config plugin reads the credential values only during Gradle configuration. It creates a separate `dayKindleEasDebug` signing config and applies it only to the Android debug variant. Without `credentials.json`, the default Android debug keystore is used. Release signing is unchanged.

To verify a built APK, run `apksigner verify --print-certs <path-to-apk>` and compare the signer SHA-1 with the EAS credentials shown by `eas credentials -p android`.

Never commit or share `credentials.json` or the keystore file.
