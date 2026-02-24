const connectDB = require("../config/db")
const bcrypt = require('bcryptjs')
const sanitizer = require('../modules/inputSanitizer')

const login = async (req, res, next) => {
    const { username: usernameRaw, password: passwordRaw } = req.body;

    // Ellenőrizzük, hogy mindkét mező ki van-e töltve
    if (!usernameRaw || !passwordRaw) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező' });
    }

    const username = sanitizer.sanitizeText(String(usernameRaw), 100);
    // A jelszót nem tisztítjuk, de korlátozzuk a hosszát a DoS támadások ellen
    if (passwordRaw.length > 72) {
        return res.status(400).json({ message: 'Túl hosszú jelszó' });
    }
    
    const password = passwordRaw; // don't modify password

    if (!username || !password) {
        return res.sendStatus(400);
    }

    const query = 'SELECT * FROM user WHERE username = ?';
    const values = [username];

    try {
        const [code, result] =  await connectDB(query, values);

    if (code == 1 || result.length == 0) {
        return res.status(400).json({ message: 'Hibás felhasználónév vagy jelszó'});
    }

    const user = result[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).json({ message: 'Hibás felhasználónév vagy jelszó'});
    }

    req.session.user = {
        id: user.id,
        username: user.username
    };

    res.redirect('/');
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    };
};

const logout = (req, res) => {
        try {
            console.log('Logout requested. sessionID:', req.sessionID, 'hasSession:', !!req.session, 'storePresent:', !!req.sessionStore);
            if (!req.session) {
                res.clearCookie('connect.sid');
                return res.redirect('/login');
            }

            req.session.destroy(err => {
                if (err) {
                    console.error('Session destroy error:', err);
                    // attempt to clear cookie anyway
                    res.clearCookie('connect.sid');
                    return res.status(500).json({ message: 'Nem sikerült kijelentkezni' });
                }
                res.clearCookie('connect.sid');
                return res.redirect('/login');
            });
        } catch (e) {
            console.error('Logout unexpected error:', e);
            try { res.clearCookie('connect.sid'); } catch (err) {}
            return res.status(500).json({ message: 'Nem sikerült kijelentkezni' });
        }
};

module.exports = { 
    login,
    logout
};