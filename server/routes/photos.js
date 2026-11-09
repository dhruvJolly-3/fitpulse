const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const ProgressPhoto = require('../models/ProgressPhoto');
const WeightLog = require('../models/WeightLog');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateBody, mongoIdParam } = require('../middleware/validate');

const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;
const MAX_THUMB_BYTES = 200 * 1024;
const MAX_PHOTOS_PER_USER = 200;
const POSES = ['front', 'side', 'back', 'other'];

// Accepts a base64 data URL and returns { mime, buffer }, or null if it is not
// a real JPEG/PNG/WebP. The magic bytes are checked so a renamed file of
// another type can't be stored and later served as an image.
const decodeImage = (dataUrl) => {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || '');
  if (!m) return null;
  const buffer = Buffer.from(m[2], 'base64');
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8;
  const isPng = buffer.slice(0, 4).toString('hex') === '89504e47';
  const isWebp = buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
  const ok = { 'image/jpeg': isJpeg, 'image/png': isPng, 'image/webp': isWebp }[m[1]];
  return ok ? { mime: m[1], buffer } : null;
};

const toMeta = (p) => ({
  _id: p._id, date: p.date, pose: p.pose, weight: p.weight, note: p.note, createdAt: p.createdAt,
});

// GET /api/photos → metadata for every photo, newest first (no image bytes)
router.get('/', auth, asyncHandler(async (req, res) => {
  const photos = await ProgressPhoto.find({ user: req.user._id }).sort({ date: -1, createdAt: -1 });
  res.json(photos.map(toMeta));
}));

// POST /api/photos  { date, pose, image: dataURL, thumb: dataURL, note? }
router.post('/', auth, validate([
  dateBody(),
  body('pose').optional().isIn(POSES).withMessage('Invalid pose'),
  body('image').isString().withMessage('image is required'),
  body('thumb').isString().withMessage('thumb is required'),
  body('note').optional().isString().isLength({ max: 200 }).withMessage('Note must be 200 characters or fewer'),
]), asyncHandler(async (req, res) => {
  const image = decodeImage(req.body.image);
  const thumb = decodeImage(req.body.thumb);
  if (!image || !thumb) return res.status(400).json({ message: 'Photos must be JPEG, PNG or WebP images' });
  if (image.buffer.length > MAX_IMAGE_BYTES) return res.status(413).json({ message: 'Photo is too large (max 1.5 MB after compression)' });
  if (thumb.buffer.length > MAX_THUMB_BYTES) return res.status(413).json({ message: 'Thumbnail is too large' });

  const count = await ProgressPhoto.countDocuments({ user: req.user._id });
  if (count >= MAX_PHOTOS_PER_USER) {
    return res.status(409).json({ message: `You can keep up to ${MAX_PHOTOS_PER_USER} photos. Delete some old ones first.` });
  }

  // Caption with the weigh-in from that day, falling back to the profile weight
  const weighIn = await WeightLog.findOne({ user: req.user._id, date: req.body.date });
  const photo = await ProgressPhoto.create({
    user: req.user._id,
    date: req.body.date,
    pose: req.body.pose || 'front',
    mime: image.mime,
    image: image.buffer,
    thumb: thumb.buffer,
    thumbMime: thumb.mime,
    weight: weighIn?.weight ?? req.user.profile?.weight,
    note: req.body.note,
  });
  res.status(201).json(toMeta(photo));
}));

// GET /api/photos/:id/image?size=thumb|full → the image bytes (auth required,
// so clients fetch it as a blob / with headers rather than a bare <img src>)
router.get('/:id/image', auth, validate([mongoIdParam('id')]), asyncHandler(async (req, res) => {
  const field = req.query.size === 'thumb' ? 'thumb' : 'image';
  const photo = await ProgressPhoto.findOne({ _id: req.params.id, user: req.user._id }).select(`+${field} mime thumbMime`);
  if (!photo) return res.status(404).json({ message: 'Photo not found' });
  res.set('Content-Type', field === 'thumb' ? photo.thumbMime : photo.mime);
  res.set('Cache-Control', 'private, max-age=86400');
  res.send(photo[field]);
}));

// DELETE /api/photos/:id
router.delete('/:id', auth, validate([mongoIdParam('id')]), asyncHandler(async (req, res) => {
  const { deletedCount } = await ProgressPhoto.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!deletedCount) return res.status(404).json({ message: 'Photo not found' });
  res.json({ message: 'Deleted' });
}));

module.exports = router;
