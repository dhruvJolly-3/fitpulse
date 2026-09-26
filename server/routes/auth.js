const router = require('express').Router();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { body } = require('express-validator');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../middleware/validate');
const { sendMail } = require('../utils/mailer');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Shape returned by every successful auth call. The client stores `token`
// and uses `user.profile.age` to decide whether onboarding is needed.
const authPayload = (user) => ({
  token: sign(user._id),
  user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar, profile: user.profile },
});

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const RESET_TTL_MS = 60 * 60 * 1000; // reset links are valid for 1 hour

// Register
router.post('/register', validate([
  body('name').trim().notEmpty().withMessage('Name is required')
    .isLength({ max: 60 }).withMessage('Name must be 60 characters or fewer'),
  body('email').trim().isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]), asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) return res.status(400).json({ message: 'Email already in use' });
  const user = await User.create({ name, email, password });
  res.status(201).json(authPayload(user));
}));

// Login
router.post('/login', validate([
  body('email').trim().isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
]), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await user.comparePassword(password)))
    return res.status(401).json({ message: 'Invalid credentials' });
  res.json(authPayload(user));
}));

// ---- Google Sign-In ----
// The client uses Google Identity Services to get an ID token (`credential`)
// and posts it here. We verify it with Google, then find or create the user.
// Needs GOOGLE_CLIENT_ID (same OAuth client ID as the client's
// REACT_APP_GOOGLE_CLIENT_ID).
router.post('/google', validate([
  body('credential').isString().notEmpty().withMessage('Missing Google credential'),
]), asyncHandler(async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) return res.status(503).json({ message: 'Google sign-in is not configured on the server' });

  let payload;
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: req.body.credential, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ message: 'Google sign-in failed — please try again' });
  }
  if (!payload.email || !payload.email_verified)
    return res.status(401).json({ message: 'Your Google email is not verified' });

  // Match on Google ID first, then on email so an existing email/password
  // account gets linked instead of duplicated.
  let user = await User.findOne({ googleId: payload.sub }) || await User.findOne({ email: payload.email });
  if (user) {
    if (!user.googleId) user.googleId = payload.sub;
    if (!user.avatar && payload.picture) user.avatar = payload.picture;
    await user.save();
  } else {
    user = await User.create({
      name: payload.name || payload.email.split('@')[0],
      email: payload.email,
      googleId: payload.sub,
      avatar: payload.picture,
    });
  }
  res.json(authPayload(user));
}));

// ---- Forgot password ----
// Always answers the same way whether or not the email exists, so this
// endpoint can't be used to discover which emails have accounts.
router.post('/forgot-password', validate([
  body('email').trim().isEmail().withMessage('Enter a valid email'),
]), asyncHandler(async (req, res) => {
  const genericReply = { message: 'If an account exists for that email, a reset link has been sent.' };
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.json(genericReply);

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordTokenHash = hashToken(token);
  user.resetPasswordExpires = new Date(Date.now() + RESET_TTL_MS);
  await user.save();

  // APP_URL = the deployed frontend, e.g. https://fitpulse-ruddy.vercel.app
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  const link = `${appUrl}/reset-password?token=${token}`;
  await sendMail({
    to: user.email,
    subject: 'Reset your FitPulse password',
    text: `Hi ${user.name},\n\nReset your password here (valid for 1 hour):\n${link}\n\nIf you didn't ask for this, ignore this email.`,
    html: `<p>Hi ${user.name},</p><p><a href="${link}">Reset your FitPulse password</a> (valid for 1 hour).</p><p>If you didn't ask for this, ignore this email.</p>`,
  });
  res.json(genericReply);
}));

// ---- Reset password ----
// Consumes the one-time token from the emailed link and sets a new password.
router.post('/reset-password', validate([
  body('token').isString().isLength({ min: 64, max: 64 }).withMessage('Invalid or expired reset link'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]), asyncHandler(async (req, res) => {
  const user = await User.findOne({
    resetPasswordTokenHash: hashToken(req.body.token),
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordTokenHash +resetPasswordExpires');
  if (!user) return res.status(400).json({ message: 'Invalid or expired reset link' });

  user.password = req.body.password; // hashed by the pre-save hook
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
  res.json(authPayload(user)); // sign straight in after a successful reset
}));

module.exports = router;
