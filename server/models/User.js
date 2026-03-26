const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
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
  timezone: { type: String, default: 'Asia/Kolkata' }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(plain) {
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

module.exports = mongoose.model('User', userSchema);
