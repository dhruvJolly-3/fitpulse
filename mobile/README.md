# FitPulse Mobile

React Native app for FitPulse (Expo SDK 58, Expo Router, TypeScript). It talks to the same Express API as the web app, so everything you log on your phone shows up on the web and the other way round.

## What's in it

| Tab / screen | What you can do |
|---|---|
| **Home** | Calorie ring, macros, water / steps / sleep / streak tiles, quick log |
| **Food** | Day-by-day meal log, 7/30-day calorie chart, **search** (60+ Indian dishes + Open Food Facts), **barcode scanning** with the camera, serving or gram amounts, custom foods |
| **Train** | Today's program day, start workout, tick off exercises, rest day, streak, workouts synced from your watch |
| **Progress** | Weigh-ins with a 30/90/365-day trend line (7-entry moving average), goal tracking, **progress photos** (camera or gallery, resized on the phone before upload) with side-by-side compare |
| **More** | Hydration, sleep, activity, profile and goals, **smart reminders**, **health sync**, sign out |

- **Health sync:** Android reads **Health Connect**, iPhone reads **Apple Health**. It pulls steps, distance, active calories, sleep, workouts and weight, and tops up the last 3 days every time the app opens (at most once an hour). Your own entries always win.
- **Smart reminders:** the server decides when a reminder is useful. For example, no water nudge if you're on pace. They arrive as push notifications through Expo's push service. Tapping one opens the matching screen.
- Light and dark mode follow the phone setting.

## Run it

```bash
cd mobile
npm install
cp .env.example .env          # set EXPO_PUBLIC_API_URL (see below)
npx expo start
```

- **API URL:** `EXPO_PUBLIC_API_URL` in `.env`. Use `http://10.0.2.2:5001` for the Android emulator, or `http://<your PC's LAN IP>:5001` for a real phone on the same Wi-Fi. If it's not set, the app uses `expo.extra.apiUrl` in `app.json`, which should be your deployed Render URL. Check that the URL is right before building.
- **Expo Go** runs everything except health sync and push notifications. Those need native modules or an EAS project.

### Testing on an iPhone without a paid Apple account

1. Install **Expo Go** from the App Store.
2. On your computer, run `npx expo start --tunnel`. `--tunnel` works even when the phone and PC are on different networks.
3. Scan the QR code with the iPhone camera.

Everything works except Apple Health sync and push notifications. Those screens explain that they need the installed app. The health libraries load only when they are used, so Expo Go doesn't crash.

### Development build (needed for health sync and push)

```bash
npm install -g eas-cli
eas login
eas init                                   # creates the EAS project and adds its projectId to app.json
eas build --profile development --platform android   # installable APK
npx expo start --dev-client
```

`eas build --profile preview --platform android` gives a standalone APK you can share. iPhone builds need an Apple Developer account, because HealthKit requires a signed app.

## Checks

```bash
npx tsc --noEmit        # typecheck
npx expo lint           # lint
npx expo export -p android -p ios -p web   # make sure every platform bundles
```

## Structure

```
src/
  app/                 Expo Router routes (each file is a screen)
    _layout.tsx        auth gate (sign-in → onboarding → tabs), notification taps, auto health sync
    (tabs)/            Home, Food, Train, Progress, More
    log-food.tsx       search / scan / custom food entry (modal)
    water.tsx sleep.tsx steps.tsx profile.tsx reminders.tsx health.tsx
  components/          UI kit (ui.tsx), SVG charts, authenticated images
  health/              index.android.ts (Health Connect), index.ios.ts (HealthKit), index.ts (web stub), sync.ts
  notifications/       Expo push registration
  lib/                 API client, auth context, dates, theme, types
```
