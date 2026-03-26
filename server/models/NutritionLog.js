const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema({
  name: String,
  brand: String,
  quantity: Number,
  unit: { type: String, default: 'g' },
  calories: Number,
  protein: Number,
  carbs: Number,
  fat: Number,
  fiber: Number,
  sugar: Number,
  sodium: Number,
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'], required: true },
  time: { type: Date, default: Date.now }
});

const nutritionLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  foods: [foodItemSchema],
  totals: {
    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    fiber: { type: Number, default: 0 }
  },
  caloriesBurnt: { type: Number, default: 0 },
  netCalories: { type: Number, default: 0 },
  notes: String
}, { timestamps: true });

nutritionLogSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('NutritionLog', nutritionLogSchema);
