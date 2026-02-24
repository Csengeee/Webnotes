const requireAuth = (req, res, next) => {
  if (req.session && req.session.user && req.session.user.id) {
    return next();
  }

  const acceptsJson = (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1) ||
    (req.headers['content-type'] && req.headers['content-type'].indexOf('application/json') !== -1) ||
    req.xhr;

  if (acceptsJson) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }

  return res.redirect('/login');
};

module.exports = { requireAuth };
