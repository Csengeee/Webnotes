const logger = require('./logger')

function errorHandler(err, req, res, next) {
  try {
    logger.error('Unhandled error:', err && err.stack ? err.stack : err)
  } catch (e) {
    console.error('Logger failed', e)
  }

  const status = err && err.status ? err.status : 500
  if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)) {
    return res.status(status).json({ status: 'error', message: err && err.message ? err.message : 'Server error' })
  }

  res.status(status)
  try {
    // try render an error page if available
    return res.render && typeof res.render === 'function' ? res.render('500', { error: err }) : res.send('Server error')
  } catch (e) {
    return res.send('Server error')
  }
}

module.exports = errorHandler
