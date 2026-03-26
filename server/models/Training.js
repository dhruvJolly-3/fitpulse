const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: String,
  category: { type: String, enum: ['strength', 'cardio', 'flexibility', 'hiit', 'yoga', 'sports'] },
  sets: Number,
  reps: Number,
  weight: Number, // kg
  duration: Number, // minutes
  distance: Number, // km
  caloriesBurnt: Number,
  notes: String,
  completed: { type: Boolean, default: false }
});

const workoutLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true },
  programName: String,
  dayLabel: String, // e.g. "Day 1 - Push", "Rest Day"
  isRestDay: { type: Boolean, default: false },
  isOffDay: { type: Boolean, default: false }, // missed day
  exercises: [exerciseSchema],
  totalCaloriesBurnt: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },
  heartRateAvg: Number,
  perceivedExertion: { type: Number, min: 1, max: 10 },
  mood: { type: String, enum: ['great', 'good', 'okay', 'tired', 'sick'] },
  notes: String,
  completedAt: Date
}, { timestamps: true });

const trainingProgramSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  description: String,
  goal: String,
  dietType: String,
  durationWeeks: Number,
  daysPerWeek: Number,
  currentWeek: { type: Number, default: 1 },
  currentDay: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  schedule: [{
    day: Number,
    label: String,
    isRest: Boolean,
    exercises: [{
      name: String,
      category: String,
      sets: Number,
      reps: String, // "8-12"
      weight: String, // "60% 1RM"
      duration: Number,
      notes: String
    }]
  }],
  generatedByAI: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = {
  WorkoutLog: mongoose.model('WorkoutLog', workoutLogSchema),
  TrainingProgram: mongoose.model('TrainingProgram', trainingProgramSchema)
};
