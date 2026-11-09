const mongoose = require('mongoose');

// A device that can receive reminders for a user.
//   web  → a browser / installed PWA, via the Web Push protocol (VAPID)
//   expo → the React Native app, via the Expo push service
const pushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['web', 'expo'], required: true },
  // web: the PushSubscription endpoint URL; expo: the ExponentPushToken[...]
  endpoint: { type: String, required: true, unique: true },
  keys: { p256dh: String, auth: String }, // web only
  userAgent: String,
  lastSuccessAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
