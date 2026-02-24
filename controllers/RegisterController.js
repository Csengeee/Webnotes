const { connectDB } = require("../config/db");
const bcrypt = require('bcryptjs');
const sanitizer = require('../modules/inputSanitizer');

const register = async (req, res, next) => {
  try {
    if (!req.body) return res.sendStatus(400);

    const raw = req.body || {};
    
    // Adatok tisztítása és előkészítése
    const username = sanitizer.sanitizeText(raw.username || '', 100);
    const email = String((raw.email || '').trim());
    const keresztnev = sanitizer.sanitizeText(raw.keresztnev || '', 100);
    const vezeteknev = sanitizer.sanitizeText(raw.vezeteknev || '', 100);
    const create_password = raw.create_password || '';
    const confirm_password = raw.confirm_password || '';

    let validationErrors = {};
    let hasError = false;

    // Jelszó erősség ellenőrzése (Legalább 8 karakter, kisbetű, nagybetű, szám, speciális karakter)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(create_password)) {
      validationErrors.password = 'weak';
      hasError = true;
    }

    if (create_password !== confirm_password) {
      validationErrors.password = 'mismatch';
      hasError = true;
    }

    // Kötelező mezők ellenőrzése
    if (!keresztnev) { validationErrors.keresztnev = true; hasError = true; }
    if (!vezeteknev) { validationErrors.vezeteknev = true; hasError = true; }
    if (!username) { validationErrors.username = true; hasError = true; }

    // Email formátum ellenőrzése
    const emailRegex = /\S+@\S+\.\S+/;
    if (!email || !emailRegex.test(email)) {
      validationErrors.email = true;
      hasError = true;
    }

    // Ha validációs hiba van, újrarendereljük az oldalt a hibákkal és a korábbi értékekkel
    if (hasError) {
      return res.render('register', {
        ...validationErrors,
        username_val: username,
        email_val: email,
        vezeteknev_val: vezeteknev,
        keresztnev_val: keresztnev
      });
    }

    // Jelszó titkosítása
    const salt = await bcrypt.genSalt(10);
    const encryptedPass = await bcrypt.hash(create_password, salt);
    
    // Felhasználó mentése (username, name, email, password)
    const fullName = `${vezeteknev} ${keresztnev}`.trim();
    const newUser = [[username, fullName, email, encryptedPass]];
    const query = 'INSERT INTO user (username, name, email, password) VALUES ?';

    const [code, result] = await connectDB(query, [newUser]);

    if (code === 1) {
      // Adatbázis szintű hiba kezelése (pl. már létező email vagy felhasználónév)
      const errorMsg = result.sqlMessage ? String(result.sqlMessage) : '';
      
      if (errorMsg.includes("'email'")) validationErrors.email = true;
      if (errorMsg.includes("'username'")) validationErrors.username = true;

      return res.render('register', {
        ...validationErrors,
        username_val: username,
        email_val: email,
        vezeteknev_val: vezeteknev,
        keresztnev_val: keresztnev
      });
    }

    // Sikeres regisztráció után átirányítás a főoldalra/loginra
    res.redirect('/');

  } catch (error) {
    // Hiba továbbítása a központi errorHandler-nek
    next(error);
  }
};

module.exports = register;