const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  // Not required for Google-only accounts (they sign in with an ID token instead).
  password: {
    type: String,
    required: function () { return !this.googleId; },
  },
  googleId: { type: String, index: true, sparse: true },
  // Forgot-password flow: only a SHA-256 hash of the emailed token is stored,
  // so a DB leak can't be used to reset passwords. Hidden from normal queries.
  resetPasswordTokenHash: { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },
  avatar: String,
  profile: {
    age: Number,
    gender: { type: String, enum: ['male', 'female', 'other'] },
    height: Number, // cm
    weight: Number, // kg
    targetWeight: Number,
    activityLevel: {
      type: String,
      enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'],
      default: 'moderately_active'
    },
    dietType: { type: String, enum: ['veg', 'non-veg', 'vegan', 'keto', 'paleo'], default: 'non-veg' },
    goal: { type: String, enum: ['lose_weight', 'maintain', 'gain_muscle', 'endurance'], default: 'maintain' },
    allergies: [String]
  },
  tdee: Number,
  bmr: Number,
  dailyCalorieTarget: Number,
  macroTargets: {
    protein: Number, // grams
    carbs: Number,
    fat: Number
  },
  waterTarget: { type: Number, default: 2500 }, // ml
  stepTarget: { type: Number, default: 10000 },
  sleepTarget: { type: Number, default: 8 }, // hours
  appleHealthSync: { type: Boolean, default: false },
  timezone: { type: String, default: 'Asia/Kolkata' },

  // Smart reminders. Times are 'HH:MM' in the user's timezone. A reminder is
  // skipped when its goal is already met (see utils/reminders.js).
  reminders: {
    enabled: { type: Boolean, default: false },
    water: { on: { type: Boolean, default: true }, everyHours: { type: Number, default: 2 }, from: { type: String, default: '09:00' }, to: { type: String, default: '21:00' } },
    meals: { on: { type: Boolean, default: true }, breakfast: { type: String, default: '09:00' }, lunch: { type: String, default: '13:30' }, dinner: { type: String, default: '20:30' } },
    workout: { on: { type: Boolean, default: true }, time: { type: String, default: '18:00' } },
    weighIn: { on: { type: Boolean, default: true }, time: { type: String, default: '08:00' } },
    bedtime: { on: { type: Boolean, default: true }, time: { type: String, default: '22:30' } },
  },

  // Fitbit (Google) account link. Tokens never leave the server.
  fitbit: {
    userId: String,
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    expiresAt: Date,
    lastSyncAt: Date,
  },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(plain) {
  if (!this.password) return false; // Google-only account has no password yet
  return bcrypt.compare(plain, this.password);
};

// Calculate TDEE using Mifflin-St Jeor
userSchema.methods.calculateTDEE = function() {
  const p = this.profile;
  if (!p.age || !p.height || !p.weight) return null;
  let bmr = p.gender === 'female'
    ? 10 * p.weight + 6.25 * p.height - 5 * p.age - 161
    : 10 * p.weight + 6.25 * p.height - 5 * p.age + 5;
  const multipliers = { sedentary: 1.2, lightly_active: 1.375, moderately_active: 1.55, very_active: 1.725, extra_active: 1.9 };
  return Math.round(bmr * (multipliers[p.activityLevel] || 1.55));
};

// Recalculate TDEE, the daily calorie target (by goal) and the macro split
// from the current profile. Called after profile or weight changes.
userSchema.methods.applyTargets = function() {
  const tdee = this.calculateTDEE();
  if (!tdee) return;
  this.tdee = tdee;
  const goal = this.profile.goal;
  this.dailyCalorieTarget = goal === 'lose_weight' ? tdee - 500
    : goal === 'gain_muscle' ? tdee + 300 : tdee;
  // Protein-forward split: 30% protein · 40% carbs · 30% fat
  const cals = this.dailyCalorieTarget;
  this.macroTargets = {
    protein: Math.round((cals * 0.30) / 4),
    carbs: Math.round((cals * 0.40) / 4),
    fat: Math.round((cals * 0.30) / 9),
  };
};

module.exports = mongoose.model('User', userSchema);
