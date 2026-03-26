const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get profile
router.get('/profile', auth, async (req, res) => {
  res.json(req.user);
});

// Update profile + recalculate TDEE
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    Object.assign(user, req.body);
    if (req.body.profile) Object.assign(user.profile, req.body.profile);
    
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
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get stats summary
router.get('/stats', auth, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
