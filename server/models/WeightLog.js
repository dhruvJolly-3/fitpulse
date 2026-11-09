const mongoose = require('mongoose');

// One weigh-in per user per day. Logging again on the same day replaces it.
const weightLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  weight: { type: Number, required: true, min: 20, max: 400 }, // kg
  bodyFat: { type: Number, min: 2, max: 70 }, // %
  note: { type: String, maxlength: 200 },
  source: { type: String, enum: ['manual', 'health_connect', 'apple_health'], default: 'manual' },
}, { timestamps: true });

weightLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WeightLog', weightLogSchema);
