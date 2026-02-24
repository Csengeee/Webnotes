// modules/errorHandler.js
const logger = require('./logger');

function errorHandler(err, req, res, next) {
    // Részletes hiba naplózása a szerver oldalon
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}\nStack: ${err.stack}`);

    const status = err.status || 500;

    // Ha API kérésről van szó, JSON választ adunk
    if (req.xhr || (req.headers.accept && req.headers.accept.indexOf('application/json') !== -1)) {
        return res.status(status).json({ 
            status: 'error', 
            message: process.env.NODE_ENV === 'production' ? 'Szerver hiba történt' : err.message 
        });
    }

    // Egyébként rendereljük az 500-as oldalt
    res.status(status);
    res.render('500', { error: process.env.NODE_ENV === 'production' ? {} : err });
}

module.exports = errorHandler;