# NearbyNow Android customer app

Native Expo / React Native client for the existing NearbyNow marketplace. It uses the live site API and the same Firebase project. Product photos are supplied by shop owners.

## Configure Google sign-in

1. In Firebase project `nearbynowstore`, add an Android app with package `store.nearbynow.customer`.
2. Register the SHA-1 and SHA-256 fingerprints of the keystore used to sign the APK. Expo EAS displays these after creating Android credentials.
3. The Firebase Web OAuth client ID has been configured in the app. You can override it with `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` from a local `.env` if the project changes.
4. The Site has been made public so Android clients can reach the API. Account and order requests still require Firebase ID tokens verified by the backend.

## Build and test

- `npm ci`
- `npx tsc --noEmit`
- `npx expo-doctor`
- `npx eas-cli build --platform android --profile preview` generates an installable APK (requires your Expo account and Android signing credentials).
- For Google Play, `npx eas-cli build --platform android --profile production` generates an AAB.

Use the same signing certificate whose SHA fingerprints are registered with Firebase. Keep the generated keystore safe. The customer app ID is `store.nearbynow.customer`.

## Updates after the first EAS build

This project is linked to the existing `@krrishsinghisthebest/nearbynow-customer` EAS project. Build and install the `preview` APK once after this configuration change:

```powershell
npm ci
npx eas-cli build --platform android --profile preview
```

For later JavaScript, TypeScript, image, and style changes, publish to the preview channel from this project directory:

```powershell
npx eas-cli update --channel preview --environment preview --message "Describe the change"
```

Force close and reopen the app twice while online to pick up a published update. The installed build and update must use the same runtime version. Changing native dependencies, Android configuration, or the app version requires a new APK. Do not use the production channel for testing.
