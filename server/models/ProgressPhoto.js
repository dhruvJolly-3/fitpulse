const mongoose = require('mongoose');

// Progress photos are stored in MongoDB as binary: the API runs on Render's
// free tier, whose disk is wiped on every deploy, so local files would vanish.
// Clients resize and compress before upload (≈1080px JPEG), keeping each
// document small; a ~320px thumbnail is stored alongside for the gallery grid.
const progressPhotoSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  pose: { type: String, enum: ['front', 'side', 'back', 'other'], default: 'front' },
  mime: { type: String, enum: ['image/jpeg', 'image/png', 'image/webp'], required: true },
  image: { type: Buffer, required: true, select: false },
  thumb: { type: Buffer, required: true, select: false },
  thumbMime: { type: String, default: 'image/jpeg' },
  weight: Number, // kg at the time of the photo, for captions
  note: { type: String, maxlength: 200 },
}, { timestamps: true });

progressPhotoSchema.index({ user: 1, date: -1 });

module.exports = mongoose.model('ProgressPhoto', progressPhotoSchema);
