# Mobile Store Packaging

This project can be packaged for Apple App Store and Google Play using Capacitor.

## Current approach

The native iPhone and Android apps act as a secure mobile wrapper around the hosted AmeryMed portal.

- App name: `AmeryMed Portal`
- App id: `com.amerytech.amerymedportal`
- Config file: [`capacitor.config.ts`](/Users/amerytech/Downloads/amerymed-web/capacitor.config.ts)
- Mobile shell fallback: [`capacitor-shell/index.html`](/Users/amerytech/Downloads/amerymed-web/capacitor-shell/index.html)

## Before generating native apps

You need a working hosted portal URL, for example:

- `https://portal.yourdomain.com`
- or the temporary SmarterASP URL once it serves the portal correctly

Set that URL as an environment variable before syncing:

```bash
export CAPACITOR_SERVER_URL="https://portal.yourdomain.com"
```

## One-time setup

From the project root:

```bash
npm install
npm run cap:add:ios
npm run cap:add:android
```

This creates the native project folders:

- `ios/`
- `android/`

## Daily sync flow

Whenever the live app URL changes or Capacitor config changes:

```bash
export CAPACITOR_SERVER_URL="https://portal.yourdomain.com"
npm run cap:sync
```

## Separate client and admin app wrappers

This repo can support two native app identities while still using one deployed portal.

- Client app:
  - app name: `AmeryMed Portal`
  - bundle id: `com.amerytech.amerymedportal`
  - start path: `/client/login`
- Admin app:
  - app name: `AmeryMed Admin`
  - bundle id: `com.amerytech.amerymedadmin`
  - start path: `/admin/login`

Use these commands when preparing each wrapper:

```bash
npm run cap:sync:client
npm run cap:sync:admin
```

For iOS, open the native project after syncing:

```bash
npm run cap:open:ios:client
npm run cap:open:ios:admin
```

The native project still lives in the same repo, but the generated Capacitor config can now be aimed at the client or admin entry route before you archive the corresponding app instance.

## Open native projects

For iPhone / iPad:

```bash
npm run cap:open:ios
```

For Android:

```bash
npm run cap:open:android
```

## Apple App Store packaging

1. Open the iOS project in Xcode.
2. Set the signing team and bundle identifier if needed.
3. Choose app icons and splash assets.
4. Archive the app in Xcode.
5. Upload through App Store Connect.

## Google Play packaging

1. Open the Android project in Android Studio.
2. Confirm `applicationId`, app name, icons, and signing.
3. Build a release `AAB`.
4. Upload through Google Play Console.

## Important note

Right now the native wrapper depends on the hosted portal being reachable. If the hosted URL is blank or broken, the mobile app will also be blank.

That means the practical order is:

1. Finish stable web hosting.
2. Point `CAPACITOR_SERVER_URL` at that stable URL.
3. Sync Capacitor.
4. Build store releases.
