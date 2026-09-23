// Central error handling. Routes never send 500s themselves — they throw
// (or call next(err)) and these two middlewares, mounted last in index.js,
// turn the error into a consistent { message } JSON response.

// Any request that didn't match a route ends up here.
const notFound = (req, res, next) => {
  const err = new Error(`Not found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
};

// Express recognises error middleware by its 4 arguments, so `next` must stay.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError') {
    // Mongoose schema validation (e.g. enum or min/max on a model)
    status = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
  } else if (err.name === 'CastError') {
    // Malformed ObjectId or wrong type reached Mongoose
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    // Unique index violation (e.g. email already registered)
    status = 409;
    message = `${Object.keys(err.keyValue || {}).join(', ') || 'Record'} already exists`;
  } else if (err.type === 'entity.parse.failed') {
    // express.json() couldn't parse the body
    message = 'Malformed JSON body';
  }

  if (status >= 500) {
    console.error(err);
    // Don't leak internals (stack traces, DB messages) to clients in production
    if (process.env.NODE_ENV === 'production') message = 'Something went wrong';
  }

  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
