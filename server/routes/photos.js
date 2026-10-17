const router = require('express').Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const Photo = require('../models/Photo');
const asyncHandler = require('../utils/asyncHandler');
const { validate, dateBody, mongoIdParam, DATE_FORMAT } = require('../middleware/validate');

const MAX_PHOTOS = 500;               // per user
const IMAGE_MAX = 1_500_000;          // chars of base64 ≈ 1.1 MB
const THUMB_MAX = 80_000;             // ≈ 60 KB
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout'];

const dataUrl = (field, max) => body(field)
  .isString().isLength({ max }).withMessage(`${field} is too large; resize it first`)
  .matches(DATA_URL).withMessage(`${field} must be a JPEG, PNG or WebP data URL`);

// GET /api/photos?kind=progress[&date=YYYY-MM-DD] → newest first, thumbs only
router.get('/', auth, validate([
  query('kind').isIn(['progress', 'meal']).withMessage('kind must be progress or meal'),
  query('date').optional().matches(DATE_FORMAT).withMessage('date must be YYYY-MM-DD'),
]), asyncHandler(async (req, res) => {
  const filter = { user: req.user._id, kind: req.query.kind };
  if (req.query.date) filter.date = req.query.date;
  res.json(await Photo.find(filter).sort({ date: -1, createdAt: -1 }).limit(200));
}));

// GET /api/photos/:id → includes the full-size image
router.get('/:id', auth, validate([mongoIdParam('id')]), asyncHandler(async (req, res) => {
  const photo = await Photo.findOne({ _id: req.params.id, user: req.user._id }).select('+image');
  if (!photo) return res.status(404).json({ message: 'Photo not found' });
  res.json(photo);
}));

router.post('/', auth, validate([
  body('kind').isIn(['progress', 'meal']).withMessage('kind must be progress or meal'),
  dateBody(),
  dataUrl('image', IMAGE_MAX),
  dataUrl('thumb', THUMB_MAX),
  body('weight').optional({ values: 'falsy' }).isFloat({ min: 20, max: 400 }).withMessage('Weight must be 20–400 kg').toFloat(),
  body('pose').optional({ values: 'falsy' }).isIn(['front', 'side', 'back']).withMessage('Invalid pose'),
  body('mealType').optional({ values: 'falsy' }).isIn(MEAL_TYPES).withMessage('Invalid meal type'),
  body('note').optional().isString().isLength({ max: 200 }).withMessage('Note must be 200 characters or fewer'),
]), asyncHandler(async (req, res) => {
  if (await Photo.countDocuments({ user: req.user._id }) >= MAX_PHOTOS) {
    return res.status(400).json({ message: `You can keep up to ${MAX_PHOTOS} photos. Delete some old ones first.` });
  }
  const { kind, date, image, thumb, weight, pose, mealType, note } = req.body;
  const photo = await Photo.create({
    user: req.user._id, kind, date, image, thumb, note,
    ...(kind === 'progress' ? { weight: weight || undefined, pose: pose || undefined } : { mealType: mealType || undefined }),
  });
  const out = photo.toObject();
  delete out.image;
  res.status(201).json(out);
}));

router.delete('/:id', auth, validate([mongoIdParam('id')]), asyncHandler(async (req, res) => {
  const gone = await Photo.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!gone) return res.status(404).json({ message: 'Photo not found' });
  res.json({ deleted: req.params.id });
}));

module.exports = router;
