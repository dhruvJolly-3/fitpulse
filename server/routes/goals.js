const router = require('express').Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');

router.get('/', auth, (req, res) => {
  const user = req.user;
  res.json({
    dailyCalorieTarget: user.dailyCalorieTarget,
    macroTargets: user.macroTargets,
    waterTarget: user.waterTarget,
    stepTarget: user.stepTarget,
    sleepTarget: user.sleepTarget,
    tdee: user.tdee,
    goal: user.profile?.goal,
    dietType: user.profile?.dietType
  });
});

router.put('/', auth, validate([
  body('dailyCalorieTarget').optional().isInt({ min: 800, max: 10000 }).withMessage('Calorie target must be 800–10000').toInt(),
  body('macroTargets').optional().isObject(),
  body('macroTargets.protein').optional().isFloat({ min: 0 }).toFloat(),
  body('macroTargets.carbs').optional().isFloat({ min: 0 }).toFloat(),
  body('macroTargets.fat').optional().isFloat({ min: 0 }).toFloat(),
  body('waterTarget').optional().isInt({ min: 500, max: 10000 }).withMessage('Water target must be 500–10000 ml').toInt(),
  body('stepTarget').optional().isInt({ min: 1000, max: 100000 }).withMessage('Step goal must be 1,000–100,000').toInt(),
  body('sleepTarget').optional().isFloat({ min: 3, max: 14 }).withMessage('Sleep target must be 3–14 hours').toFloat(),
]), asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  const { dailyCalorieTarget, macroTargets, waterTarget, stepTarget, sleepTarget } = req.body;
  if (dailyCalorieTarget) user.dailyCalorieTarget = dailyCalorieTarget;
  if (macroTargets) user.macroTargets = macroTargets;
  if (waterTarget) user.waterTarget = waterTarget;
  if (stepTarget) user.stepTarget = stepTarget;
  if (sleepTarget) user.sleepTarget = sleepTarget;
  await user.save();
  res.json({ message: 'Goals updated', user });
}));

module.exports = router;
