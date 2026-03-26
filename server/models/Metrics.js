const mongoose = require('mongoose');

const sleepLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  bedtime: Date,
  wakeTime: Date,
  duration: Number, // hours
  quality: { type: Number, min: 1, max: 5 }, // 1-5 stars
  deepSleep: Number, // hours
  remSleep: Number,
  awakeTime: Number, // minutes
  heartRateAvg: Number,
  hrv: Number,
  notes: String,
  fromAppleHealth: { type: Boolean, default: false }
}, { timestamps: true });

sleepLogSchema.index({ user: 1, date: 1 }, { unique: true });

const waterLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  entries: [{
    amount: Number, // ml
    time: { type: Date, default: Date.now },
    type: { type: String, enum: ['water', 'green_tea', 'coffee', 'juice', 'sports_drink', 'other'], default: 'water' }
  }],
  total: { type: Number, default: 0 },
  target: { type: Number, default: 2500 }
}, { timestamps: true });

waterLogSchema.index({ user: 1, date: 1 }, { unique: true });

const stepsLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  steps: { type: Number, default: 0 },
  distance: Number, // km
  caloriesBurnt: Number,
  activeMinutes: Number,
  flightsClimbed: Number,
  hourlyData: [{
    hour: Number,
    steps: Number
  }],
  fromAppleHealth: { type: Boolean, default: false }
}, { timestamps: true });

stepsLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = {
  SleepLog: mongoose.model('SleepLog', sleepLogSchema),
  WaterLog: mongoose.model('WaterLog', waterLogSchema),
  StepsLog: mongoose.model('StepsLog', stepsLogSchema)
};
