// Szükséges modulok beimportálása
const { connectDB } = require("../config/db"); // Adatbázis elérés
const bcrypt = require('bcryptjs'); // Jelszó-összehasonlításhoz
const sanitizer = require('../modules/inputSanitizer'); // Bevitel tisztításához

/**
 * Bejelentkezés folyamata
 */
const login = async (req, res, next) => {
    // Adatok kinyerése a kérés testéből (destructuring használatával)
    const { username: usernameRaw, password: passwordRaw } = req.body;

    // 1. Üres mezők ellenőrzése
    if (!usernameRaw || !passwordRaw) {
        return res.status(400).json({ message: 'Felhasználónév és jelszó megadása kötelező' });
    }

    // 2. Felhasználónév tisztítása (XSS védelem)
    const username = sanitizer.sanitizeText(String(usernameRaw), 100);

    // 3. Jelszó hosszának korlátozása (DoS védelem)
    // A bcrypt algoritmus maximum 72 karaktert kezel, a túl hosszú stringek feleslegesen terhelhetik a szervert
    if (passwordRaw.length > 72) {
        return res.status(400).json({ message: 'Túl hosszú jelszó' });
    }

    const password = passwordRaw; // A jelszót nem tisztítjuk (szanitáljuk), mert minden karakter számít

    if (!username || !password) {
        return res.sendStatus(400);
    }

    // 4. Felhasználó keresése az adatbázisban a felhasználónév alapján
    const query = 'SELECT * FROM user WHERE username = ?';
    const values = [username];

    try {
        const [code, result] = await connectDB(query, values);

        // Ha hiba van (code == 1) vagy nincs ilyen felhasználó (result.length == 0)
        if (code == 1 || result.length == 0) {
            // Biztonsági okokból ugyanazt az üzenetet adjuk vissza, ha a név nem létezik, mintha a jelszó lenne rossz
            return res.status(400).json({ message: 'Hibás felhasználónév vagy jelszó'});
        }

        const user = result[0];

        // 5. Jelszó ellenőrzése: a beküldött nyers jelszó összevetése az adatbázisban lévő hash-elt változattal
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: 'Hibás felhasználónév vagy jelszó'});
        }

        // 6. SIKER: Munkamenet (session) létrehozása
        // Eltároljuk a legfontosabb adatokat a szerver memóriájában/adatbázisában a session-ben
        req.session.user = {
            id: user.id,
            username: user.username
        };

        // Átirányítás a főoldalra
        res.redirect('/');
        
    } catch (err) {
        console.error(err); // Hiba naplózása a szerverkonzolon
        res.sendStatus(500); // 500-as szerverhiba visszaküldése
    };
};

/**
 * Kijelentkezés folyamata
 */
const logout = (req, res) => {
    try {
        // Logoljuk a kijelentkezési kísérlet részleteit (nyomkövetéshez)
        console.log('Logout requested. sessionID:', req.sessionID, 'hasSession:', !!req.session, 'storePresent:', !!req.sessionStore);
        
        // Ha nincs is aktív session, csak töröljük a sütit és megyünk a login-ra
        if (!req.session) {
            res.clearCookie('connect.sid');
            return res.redirect('/login');
        }

        // 7. Session megsemmisítése
        req.session.destroy(err => {
            if (err) {
                console.error('Session destroy error:', err);
                // Hiba esetén is megpróbáljuk törölni a böngészőből a sütit
                res.clearCookie('connect.sid');
                return res.status(500).json({ message: 'Nem sikerült kijelentkezni' });
            }
            
            // Siker esetén süti törlése és átirányítás
            res.clearCookie('connect.sid');
            return res.redirect('/login');
        });
    } catch (e) {
        console.error('Logout unexpected error:', e);
        try { res.clearCookie('connect.sid'); } catch (err) {}
        return res.status(500).json({ message: 'Nem sikerült kijelentkezni' });
    }
};

// Funkciók exportálása a többi modul számára
module.exports = { 
    login,
    logout
};