// Central error handler - keeps internal error details out of API responses
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === 'production' && status === 500
      ? 'Something went wrong. Please try again later.'
      : err.message;

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
