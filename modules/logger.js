// modules/logger.js - Frissített változat
const fs = require('fs');
const path = require('path');

const format = (level, ...args) => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}]: ${args.join(' ')}`;
};

module.exports = {
    info: (...args) => {
        const msg = format('info', ...args);
        console.log(msg);
    },
    warn: (...args) => {
        const msg = format('warn', ...args);
        console.warn(msg);
    },
    error: (...args) => {
        const msg = format('error', ...args);
        console.error(msg);
        
        // Opcionális: Hibák mentése egy error.log fájlba
        try {
            fs.appendFileSync(path.join(__dirname, '../error.log'), msg + '\n');
        } catch (e) {
            console.error('Nem sikerült a fájlba írás:', e);
        }
    }
};