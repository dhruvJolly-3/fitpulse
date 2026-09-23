// Express 4 does not catch errors thrown inside async route handlers.
// Wrapping a handler forwards any thrown error / rejected promise to
// next(err), which sends it to the central error middleware in index.js.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
