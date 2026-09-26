<div align="center">

# ⚡ FitPulse

### Train. Eat. Sleep. Repeat.

**One app for your whole fitness routine: nutrition, training, hydration, sleep and activity, tracked against targets calculated from your own body.**

[**🚀 Live App**](https://fitpulse-ruddy.vercel.app) · [Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [API](#-api-reference)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8?logo=pwa&logoColor=white)
![Vercel](https://img.shields.io/badge/Frontend-Vercel-000000?logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/API-Render-46E3B7?logo=render&logoColor=white)

</div>

---

## ✨ Why FitPulse

Most fitness apps make you juggle five different trackers. FitPulse puts everything in one place and personalises it. Enter your body stats once, and every target you see (calories, macros, water, steps, sleep) is built from **your** numbers, not generic defaults.

- 🎯 **Personal by default.** TDEE and macro targets are calculated from your age, height, weight, activity level and goal.
- 📈 **Progress you can see.** Every metric has 7-day and 30-day views.
- 🏋️ **Training that fits your life.** You choose your workout days, and the program adapts to your goal and diet.
- 🎧 **Built for the workout itself.** In-app exercise demos and a full music player with Spotify and YouTube.
- 📱 **Install it like an app.** Add FitPulse to your home screen on iPhone or Android and it opens full-screen.
- 🌗 **Light & dark mode.** Follows your system setting, or switch with one tap.
- ✨ **Feels alive.** Pulse, our mascot, jogs, lifts, sips and snoozes across the app, with motion that respects your reduced-motion setting.

---

## 🧩 Features

### 📊 Dashboard
Your day at a glance: calorie ring, macro progress, hydration, steps, sleep, TDEE and your current workout streak.

### 🍽️ Nutrition
- Log food by meal: breakfast, lunch, dinner, snacks, pre/post-workout
- Quick-pick foods plus custom entries with full macros
- Live **protein / carbs / fat / fiber** progress against your targets
- Calorie trends over **7 or 30 days**

### 🍳 Recipes
- Browse by cuisine (Indian, Chinese, Italian, Mexican, Thai and more) or search by name
- Vegetarian and vegan collections surface automatically for veg and vegan diets
- Full ingredient lists, step-by-step method and video links

### 🏋️ Training
- **Personalised programs** built from your goal and diet, on the days you pick
- Push / pull / legs / core splits for muscle gain
- Tap-to-complete exercise checklist, plus workout, rest and off-day logging
- 🔥 Streak tracking and a **30-day consistency calendar**
- ▶️ **Demo videos** for every exercise, playing right inside the app

### 🎧 Music player
- **Search** any song or pick a workout mood (Gym motivation, Bollywood workout, EDM running…)
- **Your YouTube / YouTube Music playlists** via Google sign-in
- **Spotify**: your playlists, Liked Songs and search (Spotify Premium)
- Play / pause, next / previous, seek, volume, **mute, speed, shuffle, repeat** and an **Up next** queue
- Keeps playing while you move between pages
- **Pop-out player** that floats over other apps (Chrome / Edge desktop), plus keyboard media keys and lock-screen controls

### 💧 Hydration
One-tap quick-adds, drink-type tracking (water, green tea, coffee, juice, sports drinks), and daily and monthly trends.

### 😴 Sleep
Log bedtime and wake time, and duration is calculated for you. Rate sleep quality and track your average over 7 or 30 nights.

### 👟 Activity
Step logging with auto-calculated distance, calories burned and active minutes. Progress ring against your daily goal.

### 👤 Profile & Goals
- Goals: **lose weight · maintain · build muscle · endurance**
- Diets: **non-veg · veg · vegan · keto · paleo**
- **Automatic TDEE** using the Mifflin-St Jeor equation
- **Automatic macro split**: 30% protein · 40% carbs · 30% fat
- Custom daily targets for water, steps and sleep

### 🔐 Accounts
- Email and password sign-up with secure JWT sessions
- **Sign in with Google**
- **Forgot password** with a secure one-time email link

### 📱 App experience
- **Installable (PWA)**: home-screen icon, full-screen launch, offline-ready shell
- **Light / dark mode** with a smooth cross-fade
- **Animated loading screen** and **Pulse**, the FitPulse mascot, on every page
- Phone-first layout: bottom tab bar, "More" sheet, bottom-sheet dialogs and no zoom-on-tap
- **Animated favicon** that pulses on sign-in, sign-out and while you use the app

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 · React Router v6 · Recharts · date-fns · Axios |
| **Styling** | Custom CSS design system (no UI framework) · light/dark themes · CSS animations · SVG mascot · Google Fonts: Bricolage Grotesque, Instrument Serif, Inter Tight, JetBrains Mono |
| **Backend** | Node.js · Express 4 · express-validator · Morgan |
| **Database** | MongoDB Atlas · Mongoose |
| **Auth & Security** | JWT · bcrypt password hashing · Google Identity Services · SHA-256 hashed reset tokens · CORS allowlist · central error handling |
| **Integrations** | YouTube Data API v3 · YouTube IFrame Player API · Spotify Web API + Web Playback SDK (OAuth PKCE) · TheMealDB · Nodemailer (SMTP) |
| **Browser APIs** | Service Worker · Web App Manifest · Media Session · Document Picture-in-Picture |
| **Hosting** | Vercel (frontend) · Render (API) |

### Highlights
- **Responsive layout.** Full sidebar on desktop, compact icon rail on tablets, bottom tab bar on phones.
- **Validated API.** Every request is validated, and errors come back in one consistent format.
- **Privacy-minded.** Passwords are hashed, reset tokens are stored only as hashes, and the reset flow never reveals whether an email is registered.
- **Resilient integrations.** Third-party responses are cached, and every optional integration can be switched off without breaking the app.
- **Accessible motion.** All animations turn off when the system's reduced-motion setting is on.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or [Atlas](https://www.mongodb.com/atlas))

### Run locally

```bash
git clone https://github.com/dhruvJolly-3/fitpulse.git
cd fitpulse

npm install
npm run install:all

cp server/.env.example server/.env   # add MONGODB_URI and JWT_SECRET

npm run dev
```

| Service | URL |
|---|---|
| App | http://localhost:3000 |
| API | http://localhost:5001 |
| Health check | http://localhost:5001/api/health |

### Environment variables

**Server**

| Variable | Required | Purpose |
|---|:---:|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Signs login tokens |
| `CORS_ORIGINS` | | Allowed frontend URLs |
| `APP_URL` | | Frontend URL for reset emails |
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | | Password-reset email |
| `GOOGLE_CLIENT_ID` | | Google sign-in |
| `YOUTUBE_API_KEY` | | Music search + in-app exercise videos |
| `MEALDB_API_KEY` | | Recipes (free test key by default) |

**Client**

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | Backend URL |
| `REACT_APP_GOOGLE_CLIENT_ID` | Google sign-in + YouTube playlists |
| `REACT_APP_SPOTIFY_CLIENT_ID` | Spotify login + playback |

> Optional integrations stay off until their keys are set, so the app runs fully without them.

---

## 🗂 Project Structure

```
fitpulse/
├── server/
│   ├── models/        User · NutritionLog · Training · Metrics
│   ├── routes/        auth · user · nutrition · training · water · sleep
│   │                  steps · goals · recipes · videos
│   ├── middleware/    JWT auth · validation · error handling
│   └── utils/         mailer · cache · async handler
│
└── client/
    ├── public/        manifest · service worker · app icons
    └── src/
        ├── pages/       Dashboard · Nutrition · Recipes · Training · Water
        │                Sleep · Steps · Profile · Onboarding · Auth
        ├── components/  Pulse (mascot) · Splash · MiniPlayer · MusicPanel
        │                PopoutPlayer · Ring · WeekBars · MonthCalendar
        │                ExerciseVideoModal · GoogleButton · InstallPrompt
        ├── music/       YouTube player · Spotify · YouTube playlists
        ├── context/     Auth + API client · Theme (light/dark)
        └── index.css    Design system, themes + motion
```

---

## 🔌 API Reference

All endpoints except auth and health require `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` · `/login` · `/google` | Sign up / sign in |
| `POST` | `/api/auth/forgot-password` · `/reset-password` | Password reset |
| `GET` `PUT` | `/api/user/profile` | Profile + auto TDEE and macros |
| `GET` `POST` `DELETE` | `/api/nutrition/:date` · `/:date/food` | Food log |
| `GET` | `/api/nutrition/summary/week?startDate=&days=` | Calorie history |
| `GET` `POST` `PUT` | `/api/training/programs` | Training programs |
| `GET` `POST` | `/api/training/logs` · `/streak` | Workouts + streak |
| `GET` `POST` | `/api/water` · `/api/sleep` · `/api/steps` | Daily metrics |
| `GET` | `/api/{water,sleep,steps}/history/week?startDate=&days=` | 7–30 day history |
| `GET` | `/api/recipes/search` · `/api/recipes/:id` | Recipes |
| `GET` | `/api/videos/search?q=` | Exercise videos |
| `GET` | `/api/videos/music?q=` | Music search |
| `GET` | `/api/health` | Service status |

---

## 🗺 Roadmap

- [ ] Google Health / Fitbit sync (steps, sleep, workouts)
- [ ] Large food database with barcode scanning
- [ ] Daily weight log with trend chart
- [ ] Smart reminders via push notifications
- [ ] Progress photos

---

<div align="center">

**Built by [Dhruv Jolly](https://github.com/dhruvJolly-3)**

</div>
