# FitPulse mobile apps (Android + iOS)

The Android and iOS apps are built from this same React code with
[Capacitor](https://capacitorjs.com). The website, the Vercel deploy and the
API are unchanged: everything app-specific sits behind `isNativeApp` in
`src/platform.js`.

## What's in the repo

| Path | What it is |
|---|---|
| `capacitor.config.json` | App id (`com.dhruvjolly.fitpulse`), name, splash and keyboard settings |
| `android/` | Android Studio project |
| `ios/` | Xcode project (Swift Package Manager, no CocoaPods needed) |
| `assets/` | Source icon and splash images (`npx capacitor-assets generate` rebuilds all sizes) |
| `src/platform.js` | `isNativeApp`, `openExternal()` |
| `src/native.js` | Status bar, Android back button, external links, splash hide |

## Build and run

The app talks to the live API (`https://fitpulse-psmj.onrender.com`) by default.
Point it elsewhere with `REACT_APP_API_URL=... npm run build:mobile`.

```bash
cd client
npm install
npm run android   # builds, syncs, opens Android Studio → press ▶ Run
npm run ios       # builds, syncs, opens Xcode → pick a simulator or iPhone → ▶ Run
```

After any change to the React code, run `npm run build:mobile` (or the commands
above) so the apps get the new build.

**You need:** Android Studio (any recent version) for Android; a Mac with Xcode 15+
for iOS. Running on a real iPhone needs your Apple ID under Xcode → Signing & Capabilities.

## Differences from the website

| Feature | App | Why |
|---|---|---|
| Email / password sign-in, all tracking, recipes, demos, music search | ✅ Same as web | |
| Sign in with Google | Hidden | Google blocks its sign-in inside app WebViews |
| YouTube playlists, Spotify | Web only (a note points to the website) | Their OAuth popups/redirects return to the website |
| Pop-out player, install banner, service worker | Off | Not needed / not available inside an app |
| Links to other sites | Open in the in-app browser | So the app isn't replaced by the other site |

## Publishing

- **Play Store:** Android Studio → Build → Generate Signed Bundle (.aab) → upload in Play Console ($25 one-time).
- **App Store:** Xcode → Product → Archive → Distribute → App Store Connect (Apple Developer Program, $99/year).
