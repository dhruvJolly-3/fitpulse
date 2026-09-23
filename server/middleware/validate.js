const { validationResult, param, query, body } = require('express-validator');

// Runs a list of express-validator rules, then either continues to the route
// handler or responds 400 with every failed field.
// Usage: router.post('/', auth, validate([body('x').isInt()]), handler)
const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();
    const errors = result.array().map(e => ({ field: e.path, message: e.msg }));
    // `message` keeps the same shape the client already reads for errors
    res.status(400).json({ message: errors[0].message, errors });
  },
];

// Shared rules. Dates are stored as 'YYYY-MM-DD' strings throughout the app.
const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MSG = 'must be a date in YYYY-MM-DD format';

const dateParam = () => param('date').matches(DATE_FORMAT).withMessage(`date ${DATE_MSG}`);
const dateBody = () => body('date').matches(DATE_FORMAT).withMessage(`date ${DATE_MSG}`);
const startDateQuery = () => query('startDate').matches(DATE_FORMAT).withMessage(`startDate ${DATE_MSG}`);
const mongoIdParam = (name) => param(name).isMongoId().withMessage(`${name} is not a valid id`);

module.exports = { validate, dateParam, dateBody, startDateQuery, mongoIdParam, DATE_FORMAT };
