const mongoose = require('mongoose');

// One weigh-in per user per day (logging again the same day replaces it).
const weightLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  weight: { type: Number, required: true }, // kg
  note: String,
  source: { type: String, enum: ['manual', 'fitbit'], default: 'manual' },
}, { timestamps: true });

weightLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('WeightLog', weightLogSchema);
