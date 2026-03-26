# 🏋️ FitPulse — Intelligent Fitness & Nutrition Tracker

A full-stack **MERN** application for MacBook (web) and iPhone 17 (PWA/responsive).  
Built for serious tracking: calories, macros, training programs, water, sleep, steps, and TDEE.

---

## ✨ Features

### 🍽️ Nutrition Tracking
- Log meals by type: Breakfast, Lunch, Dinner, Snack, Pre/Post Workout
- Searchable food database (20+ Indian/global foods)
- Custom food entry with full macro input
- Daily calorie goal tracking vs TDEE
- Macro breakdown: Protein / Carbs / Fat / Fiber
- 7-day calorie history chart
- Net calories (consumed − burnt)

### 🏋️ Training
- **AI-generated programs** tailored to your goal + diet type:
  - `lose_weight` + `non-veg` → Fat Burn Pro (5×/week, 12 weeks)
  - `lose_weight` + `veg` → Lean & Green (5×/week, 10 weeks)
  - `gain_muscle` + `non-veg` → Mass Builder Pro (6×/week, 16 weeks)
- Exercise checklist with completion tracking
- Log On Days, Rest Days, and Off Days
- Streak counter 🔥
- Weekly schedule overview
- Recent workout history

### 💧 Hydration
- Quick-add buttons (150ml / 250ml / 350ml / 500ml)
- Drink type tracking: Water, Green Tea, Coffee, Juice, Sports Drink
- Animated water fill visualization
- 7-day area chart
- Entry deletion

### 😴 Sleep
- Log bedtime + wake time
- Auto-calculated sleep duration
- Quality rating (1–5 stars)
- Sleep deficit tracking
- 7-night bar chart
- Apple Health integration guide

### 👟 Activity / Steps
- Manual step entry with auto-calculated distance + calories
- Steps progress ring
- 7-day step history
- Active minutes tracking
- Apple Fitness / HealthKit integration guide

### 📊 Dashboard
- Daily calorie ring with net/burnt display
- Macro progress bars
- Hydration, Steps, Sleep, TDEE tiles
- Streak badge
- Quick log shortcuts

### 👤 Profile & Goals
- Body stats: age, gender, height, weight, target weight
- Goal selection: Lose Weight / Maintain / Build Muscle / Endurance
- Diet type: Non-Veg / Veg / Vegan / Keto / Paleo
- Activity level (used for TDEE)
- **Auto TDEE calculation** (Mifflin-St Jeor formula)
- **Auto macro targets** (30% protein / 40% carbs / 30% fat)
- Custom daily targets: water, steps, sleep

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- npm

### Setup

```bash
# 1. Clone / extract project
cd fitpulse

# 2. Install all dependencies
npm run install:all

# 3. Configure server environment
cd server
cp .env.example .env
# Edit .env and set MONGO_URI if using Atlas

# 4. Run both server + client
cd ..
npm install        # installs concurrently
npm run dev
```

- **Server**: http://localhost:5001
- **Client**: http://localhost:3000

---

## 📱 iPhone 17 Setup (PWA)

1. Open Safari on your iPhone 17
2. Navigate to `http://YOUR_MAC_IP:3000`
3. Tap the **Share** button → **Add to Home Screen**
4. FitPulse installs as a native-feeling app with full-screen support

### Apple Health Integration
To sync steps and sleep from your iPhone:
1. **Settings → Privacy & Security → Motion & Fitness → Enable FitPulse**
2. **Health App → Sources → FitPulse → Allow All**
3. For sleep: Health App → Sources → FitPulse → Sleep → Enable

---

## 🏗️ Architecture

```
fitpulse/
├── server/                  # Express + MongoDB API
│   ├── models/
│   │   ├── User.js          # Profile, TDEE, goals
│   │   ├── NutritionLog.js  # Meals + macros
│   │   ├── Training.js      # Programs + workout logs
│   │   └── Metrics.js       # Sleep, Water, Steps
│   ├── routes/
│   │   ├── auth.js          # JWT login/register
│   │   ├── user.js          # Profile + TDEE calc
│   │   ├── nutrition.js     # Food logging
│   │   ├── training.js      # Programs + workouts
│   │   ├── water.js         # Hydration logs
│   │   ├── sleep.js         # Sleep logs
│   │   ├── steps.js         # Step logs
│   │   └── goals.js         # Daily targets
│   └── index.js
│
└── client/                  # React PWA
    └── src/
        ├── context/
        │   └── AuthContext.js   # Auth + API instance
        ├── components/
        │   └── AppShell.js      # Sidebar + mobile nav
        └── pages/
            ├── AuthPage.js      # Login / Register
            ├── OnboardingPage.js # First-time setup
            ├── Dashboard.js     # Overview
            ├── NutritionPage.js # Calorie tracker
            ├── TrainingPage.js  # Workout programs
            ├── WaterPage.js     # Hydration
            ├── SleepPage.js     # Sleep tracker
            ├── StepsPage.js     # Activity tracker
            └── ProfilePage.js   # Settings
```

---

## 🎨 Design System

- **Palette**: Deep obsidian (`#080809`) + Electric Lime accent (`#b5f23d`)
- **Typography**: Syne (display) + DM Sans (body) + DM Mono (numbers)
- **Responsive**: Full sidebar on MacBook, bottom tab nav on iPhone
- **PWA**: `viewport-fit=cover` + safe area insets for Dynamic Island

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login + get JWT |
| GET/PUT | `/api/user/profile` | Get/update profile |
| GET | `/api/nutrition/:date` | Get daily food log |
| POST | `/api/nutrition/:date/food` | Add food entry |
| DELETE | `/api/nutrition/:date/food/:id` | Remove food |
| GET | `/api/training/programs` | List programs |
| POST | `/api/training/programs` | Create program |
| GET/POST | `/api/training/logs` | Workout logs |
| GET | `/api/training/streak` | Streak count |
| GET/POST | `/api/water/:date` | Water log |
| GET/POST | `/api/sleep/:date` | Sleep log |
| GET/POST | `/api/steps/:date` | Steps log |
| GET/PUT | `/api/goals` | View/update daily targets |

---

## 🔮 Extend With

- **Nutritionix API** — 700K+ food database with barcode scanning
- **HealthKit Bridge** — Native iOS app for real-time Apple Health sync
- **OpenAI API** — Natural language meal logging ("I had dal chawal")
- **Push Notifications** — Reminders via Web Push API
- **Weight Log** — Daily weigh-in tracker with trend chart
- **Progress Photos** — Before/after photo timeline

---

*Built with ❤️ · MERN Stack · Designed for MacBook + iPhone 17*
