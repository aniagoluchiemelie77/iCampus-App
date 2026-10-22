# iCampus – Mobile App

iCampus is a campus super-app for students, lecturers, institutions and the wider community. It combines a social feed, a classroom (courses, live classes, attendance, tests, gradebook), a campus marketplace with escrowed delivery, and tiered analytics that institutions subscribe to.

This repo is the **React Native app** (Android and iOS). The API lives in the companion repo [`iCampus-backendscripts`](../iCampus-backendscripts).

---

## Features

**Classroom**
- Courses from an uploaded course form (AI extraction) or manual entry
- Lecture scheduling with repeat weeks, edit/postpone, and push reminders 45 min before class
- **Physical attendance over Bluetooth LE**: the lecturer's phone broadcasts a beacon, and students in the room check in with fingerprint or a selfie face match
- **Live online classes on Agora**: video, screen share (Android), raise hand / give the floor, live captions (Deepgram), chat; attendance recorded automatically
- Proctored tests: randomised questions, random identity snapshots, look-away / multiple-face detection, app-switch strikes, call handling, auto-submit
- Exceptions (excused absences, paid after the monthly allowance), assignments, course materials, syllabus
- **Grade Accelerator**: a per-course gradebook combining attendance and test scores with lecturer-set weights, exportable as PDF

**Social**
- Feed with posts, polls, jobs and events, mentions, reposts, bookmarks, comments
- Background post upload with a progress card
- School-only memos for institution admins

**Marketplace**
- Listings, cart, favourites, checkout through Flutterwave
- Home delivery or drop-off stations; the buyer's QR code releases funds to the seller
- Sales Hub: orders, inventory, payouts, reviews

**Accounts & admin**
- Student, lecturer, enterprise and general accounts; Free / Pro / Premium subscriptions
- Identity verification (Persona), WhatsApp phone verification, 2FA, sessions
- Admin dashboard: platform finance and health for staff; **tiered school analytics** (Basic, Professional, Enterprise) for school administrators

---

## Tech stack

| Area | Library |
| --- | --- |
| Framework | React Native 0.86 (TypeScript), React Navigation |
| State | Redux Toolkit + React context (`EventContext`, `ThemeContext`, `PostUploadContext`) |
| Realtime | Socket.IO client |
| Live video | `react-native-agora` (tokens issued by the backend) |
| Push | `@react-native-firebase/messaging` (FCM) |
| Bluetooth | `react-native-ble-manager` (scan), `react-native-ble-peripheral` (advertise) |
| Camera / face | `react-native-vision-camera`, `react-native-biometrics` |
| Local cache | `react-native-quick-sqlite` (product catalog) |
| Payments | Flutterwave (pay sheet), server-verified |

---

## Project structure

```
App.tsx                  Navigation stack, providers, session bootstrap
src/
  api/                   REST clients (localGetApis, localPostApis, localPatchApis, …)
  components/            Feature components (PostCard, CourseActionsComponent, live class, …)
  screens/               Route screens
  context/               Redux slices + React contexts
  hooks/                 useAgoraClass, useLiveSession, useSocket, useSQLiteDb, …
  utils/                 Helpers (lectureTime, attendance, notificationNavigation, …)
  types/firebase.d.ts    Shared data types
android/ ios/            Native projects
patches/                 patch-package fixes for native libraries
THIRD_PARTY_SERVICES.txt Paid services needed to run iCampus, with rough costs
```

---

## Getting started

### Prerequisites
- Node 20+, JDK 17, Android Studio (SDK + an emulator or device)
- Xcode 15+ and CocoaPods for iOS
- The backend running locally or deployed (see the backend README)
- A Firebase project with `google-services.json` (Android) and `GoogleService-Info.plist` (iOS)

### Install

```sh
git clone https://github.com/aniagoluchiemelie77/iCampus-App.git
cd iCampus
npm install          # also applies patches/ via patch-package
cd ios && pod install && cd ..
```

### Environment variables

Create `.env` in the project root (read through `react-native-dotenv` as `@env`):

```sh
# Backend
BACKEND_URL=https://your-backend.example.com/   # trailing slash required
INBOUND_SUPPORT_URL=

# Firebase web SDK (Cloud Storage uploads)
APIKEY=
AUTH_DOMAIN=
PROJECT_ID=
STORAGE_BUCKET=
MESSAGING_SENDER_ID=
APP_ID=
MEASUREMENT_ID=

# Sign-in
WEB_CLIENT_ID=            # Google Sign-In web client id
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=     # see security note below
ICAMPUS_APPLE_ID=

# Payments & money
FLUTTERWAVE_PUBLIC_KEY=
EXCHANGERATE_API_KEY=
VERVE_SEARCH_API_KEY=     # optional BIN lookup fallback

# Media & AI
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_UPLOAD_PRESET=
GEMINI_API_KEY=

# Bluetooth attendance: any UUID, must match on every device
SERVICE_UUID=
```

Live classes need **no app-side Agora key**. The backend returns the App ID and a short-lived token for each class, so you only set `AGORA_APP_ID` and `AGORA_APP_CERTIFICATE` in the backend `.env`.

> **Security:** everything in this `.env` is bundled into the app and can be extracted. `GITHUB_CLIENT_SECRET` and `GEMINI_API_KEY` should be moved behind the backend; until then, restrict the Gemini key to your Android/iOS app in Google Cloud.

### Run

```sh
npx react-native start
npx react-native run-android     # or: npx react-native run-ios
```

Bluetooth attendance and live video need **real devices**. Emulators can't advertise BLE beacons, and their camera support is limited.

### Type-check and lint

```sh
npx tsc --noEmit
npx eslint src
```

---

## Notes for contributors

- **Dates:** Firestore timestamps reach the app as ISO strings or `{_seconds}` objects. Use `parseFirestoreDate` / `safeParseDate` (`utils/dateFormatter.ts`), and use `resolveLectureTime` (`utils/lectureTime.ts`) for lecture start and end times.
- **Notification taps:** routing for every notification type lives in `utils/notificationNavigation.ts`, shared by the Notifications list and push taps.
- **Attendance entry points:** shared in `utils/attendance.ts` (Classroom tab "Today" card, schedule, ongoing-class sheet, push).
- **Native permissions:** camera, microphone, Bluetooth and the screen-share foreground service are declared in `AndroidManifest.xml` and `Info.plist`. Rebuild the native app after changing them.

## Costs
See [`THIRD_PARTY_SERVICES.txt`](THIRD_PARTY_SERVICES.txt) for every external service the app and backend depend on, what each is used for, and approximate pricing.
