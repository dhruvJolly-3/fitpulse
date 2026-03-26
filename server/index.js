require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));
app.use('/api/nutrition', require('./routes/nutrition'));
app.use('/api/training', require('./routes/training'));
app.use('/api/water', require('./routes/water'));
app.use('/api/sleep', require('./routes/sleep'));
app.use('/api/steps', require('./routes/steps'));
app.use('/api/goals', require('./routes/goals'));

app.get('/api/health', (req, res) => res.json({ status: 'FitPulse API Running' }));

// DB + Start
const PORT = process.env.PORT || 5001;
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/fitpulse')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('DB error:', err));
