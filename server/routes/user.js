const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');

// Only these fields can be changed through PUT /profile. Anything else in the
// body (email, password, tdee, _id…) is ignored instead of blindly assigned.
const PROFILE_FIELDS = ['age', 'gender', 'height', 'weight', 'targetWeight', 'activityLevel', 'dietType', 'goal', 'allergies'];
const TARGET_FIELDS = ['waterTarget', 'stepTarget', 'sleepTarget'];

const profileRules = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
    .isLength({ max: 60 }).withMessage('Name must be 60 characters or fewer'),
  body('profile').optional().isObject(),
  body('profile.age').optional().isInt({ min: 13, max: 100 }).withMessage('Age must be between 13 and 100').toInt(),
  body('profile.gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('profile.height').optional().isFloat({ min: 50, max: 300 }).withMessage('Height must be 50–300 cm').toFloat(),
  body('profile.weight').optional().isFloat({ min: 20, max: 400 }).withMessage('Weight must be 20–400 kg').toFloat(),
  // Onboarding sends '' when target weight is left blank, so skip falsy values
  body('profile.targetWeight').optional({ values: 'falsy' }).isFloat({ min: 20, max: 400 }).withMessage('Target weight must be 20–400 kg').toFloat(),
  body('profile.activityLevel').optional()
    .isIn(['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active']).withMessage('Invalid activity level'),
  body('profile.dietType').optional().isIn(['veg', 'non-veg', 'vegan', 'keto', 'paleo']).withMessage('Invalid diet type'),
  body('profile.goal').optional().isIn(['lose_weight', 'maintain', 'gain_muscle', 'endurance']).withMessage('Invalid goal'),
  body('profile.allergies').optional().isArray(),
  body('waterTarget').optional().isInt({ min: 500, max: 10000 }).withMessage('Water target must be 500–10000 ml').toInt(),
  body('stepTarget').optional().isInt({ min: 1000, max: 100000 }).withMessage('Step goal must be 1,000–100,000').toInt(),
  body('sleepTarget').optional().isFloat({ min: 3, max: 14 }).withMessage('Sleep target must be 3–14 hours').toFloat(),
];

// Get profile
router.get('/profile', auth, (req, res) => {
  res.json(req.user);
});

// Update profile + recalculate TDEE
router.put('/profile', auth, validate(profileRules), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (req.body.name !== undefined) user.name = req.body.name;
  TARGET_FIELDS.forEach(f => { if (req.body[f] !== undefined) user[f] = req.body[f]; });
  if (req.body.profile) {
    PROFILE_FIELDS.forEach(f => { if (req.body.profile[f] !== undefined) user.profile[f] = req.body.profile[f]; });
  }

  const tdee = user.calculateTDEE();
  if (tdee) {
    user.tdee = tdee;
    // Adjust calorie target based on goal
    const goal = user.profile.goal;
    user.dailyCalorieTarget = goal === 'lose_weight' ? tdee - 500
      : goal === 'gain_muscle' ? tdee + 300 : tdee;
    // Default macros (protein-forward)
    const cals = user.dailyCalorieTarget;
    user.macroTargets = {
      protein: Math.round((cals * 0.30) / 4),
      carbs: Math.round((cals * 0.40) / 4),
      fat: Math.round((cals * 0.30) / 9)
    };
  }
  await user.save();

  const updated = user.toObject();
  delete updated.password; // never send the hash back
  res.json(updated);
}));

// Get stats summary
router.get('/stats', auth, (req, res) => {
  const user = req.user;
  res.json({
    tdee: user.tdee,
    bmr: user.bmr,
    dailyCalorieTarget: user.dailyCalorieTarget,
    macroTargets: user.macroTargets,
    waterTarget: user.waterTarget,
    stepTarget: user.stepTarget,
    sleepTarget: user.sleepTarget
  });
});

module.exports = router;
