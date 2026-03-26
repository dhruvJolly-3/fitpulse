const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

router.get('/', auth, async (req, res) => {
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

router.put('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { dailyCalorieTarget, macroTargets, waterTarget, stepTarget, sleepTarget } = req.body;
    if (dailyCalorieTarget) user.dailyCalorieTarget = dailyCalorieTarget;
    if (macroTargets) user.macroTargets = macroTargets;
    if (waterTarget) user.waterTarget = waterTarget;
    if (stepTarget) user.stepTarget = stepTarget;
    if (sleepTarget) user.sleepTarget = sleepTarget;
    await user.save();
    res.json({ message: 'Goals updated', user });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
