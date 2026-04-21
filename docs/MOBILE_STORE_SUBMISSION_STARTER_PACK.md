# Mobile Store Submission Starter Pack

This guide is the practical starter pack for publishing the AmeryMed mobile app to:

- Apple App Store
- Google Play Store

It is written for a first-time setup.

## What this mobile app is

The current mobile app strategy uses Capacitor as a native wrapper around the hosted AmeryMed portal.

That means:

- the website must be hosted and working first
- the iPhone app and Android app open that hosted portal inside a native mobile shell
- if the hosted portal is blank, the mobile app will also be blank

## Current app identity

- App name: `AmeryMed Portal`
- App id / bundle id: `com.amerytech.amerymedportal`
- Capacitor config: [capacitor.config.ts](/Users/amerytech/Downloads/amerymed-web/capacitor.config.ts)
- Mobile shell page: [capacitor-shell/index.html](/Users/amerytech/Downloads/amerymed-web/capacitor-shell/index.html)

## Separate client and admin apps

If you want separate App Store listings for clients and staff, keep one hosted portal and generate two native wrappers:

- Client app
  - app name: `AmeryMed Portal`
  - bundle id: `com.amerytech.amerymedportal`
  - launch path: `/client/login`
- Admin app
  - app name: `AmeryMed Admin`
  - bundle id: `com.amerytech.amerymedadmin`
  - launch path: `/admin/login`

Use:

```bash
npm run cap:sync:client
npm run cap:sync:admin
```

Then open the iOS project for the app variant you are preparing:

```bash
npm run cap:open:ios:client
npm run cap:open:ios:admin
```

## First prerequisite

Before store submission, confirm the live hosted portal works in a mobile browser:

- client login page opens
- admin login page opens
- login succeeds
- uploads work
- messaging works
- logout works
- camera or photo upload flow works on mobile

Recommended target URL examples:

- `https://portal.amerymed.com`
- `https://portal.amerytechnet.com`
- or another stable production domain/subdomain

## Accounts you need

### Apple

- Apple ID with two-factor authentication
- Apple Developer Program membership
- Access to a Mac with Xcode installed

### Android

- Google account
- Google Play Console developer account
- Android Studio installed

## Assets you should prepare

Create one folder for all store assets, for example:

- `store-assets/ios/`
- `store-assets/android/`

Prepare these items:

### App branding

- app icon, square, high resolution
- launch / splash background color
- short app description
- full app description
- support email
- privacy policy URL

### Screenshots

Take real screenshots from the production-like app:

- client login
- client dashboard
- upload form
- camera / image upload
- admin dashboard
- admin messaging
- live feed / updates

### Recommended screenshot set

- 3 to 5 iPhone screenshots
- 3 to 5 Android phone screenshots
- optional iPad screenshots later

## Privacy and compliance notes for this app

This app handles medical billing workflow data and document uploads. Before store submission, make sure the listing materials clearly state:

- authenticated access only
- documents are uploaded securely
- portal messaging is for operational support
- users should not use the app for emergency medical communication

You should also have a privacy policy page that explains:

- what user data is collected
- how files are stored
- how authentication works
- who can access uploaded documents
- retention / deletion policy

## Recommended release order

1. Finish web hosting.
2. Test the hosted portal on desktop and mobile browser.
3. Point Capacitor at the hosted URL.
4. Generate native builds.
5. Test on real iPhone and Android devices.
6. Submit to TestFlight and Google internal testing first.
7. Fix issues.
8. Submit to public app review.

## One-time project setup

From the project root:

```bash
npm install
npm run cap:add:ios
npm run cap:add:android
```

Native project folders created:

- [ios](/Users/amerytech/Downloads/amerymed-web/ios)
- [android](/Users/amerytech/Downloads/amerymed-web/android)

## Point mobile app to the hosted portal

Set the live hosted URL before syncing:

```bash
export CAPACITOR_SERVER_URL="https://portal.yourdomain.com"
npm run cap:sync
```

If the hosted URL changes later, run the same sync step again.

## Apple App Store workflow

### Step 1. Open the iOS project

```bash
npm run cap:open:ios
```

This opens the Xcode workspace.

### Step 2. Configure signing

In Xcode:

- select the app target
- open `Signing & Capabilities`
- choose your Apple Developer team
- confirm bundle identifier is correct

### Step 3. Set app icon and app display name

In Xcode:

- update app icons if needed
- verify display name is `AmeryMed Portal`

### Step 4. Test on a real iPhone

Connect an iPhone and run the app from Xcode.

Verify:

- app launches
- login works
- dashboard loads
- upload works
- camera/photo selection works
- messaging works
- logout works

### Step 5. Create App Store Connect record

In App Store Connect:

- create new app
- choose platform `iOS`
- app name: `AmeryMed Portal`
- bundle id: `com.amerytech.amerymedportal`
- SKU: any internal code, for example `amerymed-ios-001`

### Step 6. Archive and upload

In Xcode:

- choose `Any iOS Device`
- go to `Product > Archive`
- validate archive
- upload to App Store Connect

### Step 7. Fill listing details

In App Store Connect:

- app name
- subtitle
- description
- keywords
- screenshots
- support URL
- privacy policy URL
- age rating
- app privacy questionnaire

### Step 8. Use TestFlight first

Recommended:

- upload build to TestFlight
- add internal testers
- test login, upload, messaging, logout, mobile responsiveness

### Step 9. Submit for review

After TestFlight is stable:

- choose production release
- submit to Apple review

## Google Play workflow

### Step 1. Open Android project

```bash
npm run cap:open:android
```

This opens the project in Android Studio.

### Step 2. Confirm app identity

Verify:

- package/application id is `com.amerytech.amerymedportal`
- app name is correct
- icons are correct

### Step 3. Test on real Android device

Run on an Android phone and verify:

- launch
- login
- dashboard
- upload
- photo / camera workflow
- messaging
- logout

### Step 4. Create signing key

In Android Studio or command line, create a release keystore.

Store these safely:

- keystore file
- keystore password
- key alias
- key password

Without these, future Android updates cannot be published.

### Step 5. Build release AAB

Use Android Studio:

- `Build`
- `Generate Signed Bundle / APK`
- choose `Android App Bundle`

Upload the `.aab` file to Google Play Console.

### Step 6. Create Play Console listing

In Google Play Console:

- create app
- set app name
- choose category
- add short description
- add full description
- upload screenshots
- add privacy policy URL
- complete Data safety form

### Step 7. Internal testing first

Recommended release path:

- Internal testing
- Closed testing
- Production

This keeps first release safer.

## Store listing starter text

You can refine this later, but here is a clean starting point.

### Short description

`Secure client and admin portal for document upload, operational messaging, and medical billing workflow updates.`

### Full description

`AmeryMed Portal helps physician offices and internal operations teams securely manage document uploads, review workflow activity, and communicate quickly through a single mobile-friendly portal. Users can submit billing-related documents, review upload history, and stay connected with operations support from one place.`

## Release checklist

Before sending to stores, confirm all of the following:

- live production URL works
- SSL is active
- login works for QA client user
- login works for QA admin user
- upload works for images and files
- mobile photo upload works
- live messaging works
- live feed loads correctly
- logo and branding display correctly
- privacy policy URL exists
- support contact email is ready
- app icons are final
- screenshots are final

## Future update workflow

Every time you release a new app version:

1. update the web app
2. deploy the hosted portal
3. verify production works
4. run `npm run cap:sync`
5. rebuild iOS / Android
6. submit updated builds to TestFlight / Play testing
7. promote to production

## Very important limitation right now

At this moment, mobile store packaging is prepared in the codebase, but public store submission should wait until the hosted production portal is serving correctly. The current SmarterASP blank-page hosting issue must be resolved first, otherwise the iPhone and Android app wrappers will also load a blank app.

## Related docs

- [Mobile Store Packaging](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_STORE_PACKAGING.md)
- [Mobile QA Checklist](/Users/amerytech/Downloads/amerymed-web/docs/MOBILE_QA_CHECKLIST.md)
- [SmarterASP Deployment Checklist](/Users/amerytech/Downloads/amerymed-web/docs/SMARTERASP_DEPLOYMENT_CHECKLIST.md)
- [Developer Guide](/Users/amerytech/Downloads/amerymed-web/docs/DEVELOPER_GUIDE.md)
