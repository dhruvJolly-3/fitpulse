const router = require('express').Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || 'fitpulse_secret_key', { expiresIn: '30d' });

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already in use' });
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: sign(user._id), user: { id: user._id, name, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email, profile: user.profile } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
