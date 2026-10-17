const mongoose = require('mongoose');

// Progress photos and meal photos. The app resizes images before upload
// (max ~1080px JPEG for `image`, ~240px for `thumb`), so they fit in MongoDB
// without a separate file store. Lists return thumbs only; the full image is
// fetched one at a time.
const photoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  kind: { type: String, enum: ['progress', 'meal'], required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  image: { type: String, required: true, select: false }, // data URL
  thumb: { type: String, required: true },                // data URL
  weight: Number,   // progress: kg on the day, optional
  pose: { type: String, enum: ['front', 'side', 'back'] }, // progress
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'] }, // meal
  note: String,
}, { timestamps: true });

photoSchema.index({ user: 1, kind: 1, date: -1 });

module.exports = mongoose.model('Photo', photoSchema);
