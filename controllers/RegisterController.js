// Szükséges modulok importálása
const { connectDB } = require("../config/db"); // Adatbázis kapcsolat kezelő
const bcrypt = require('bcryptjs'); // Jelszó titkosításhoz (hashing)
const sanitizer = require('../modules/inputSanitizer'); // Input tisztító segédmodul

/**
 * Regisztrációs folyamatot kezelő aszinkron függvény
 */
const register = async (req, res, next) => {
  try {
    // 1. Alapvető ellenőrzés: ha nincs body a kérésben, 400-as hibát küldünk
    if (!req.body) return res.sendStatus(400);

    const raw = req.body || {};
    
    // 2. Adatok tisztítása és előkészítése (XSS elleni védelem és whitespace eltávolítás)
    const username = sanitizer.sanitizeText(raw.username || '', 100);
    const email = String((raw.email || '').trim());
    const keresztnev = sanitizer.sanitizeText(raw.keresztnev || '', 100);
    const vezeteknev = sanitizer.sanitizeText(raw.vezeteknev || '', 100);
    const create_password = raw.create_password || '';
    const confirm_password = raw.confirm_password || '';

    // Hibaobjektum inicializálása a frontend visszajelzésekhez
    let validationErrors = {};
    let hasError = false;

    // 3. Jelszó erősség ellenőrzése 
    // Feltétel: min. 8 karakter, kisbetű, nagybetű, szám, speciális karakter
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if (!passwordRegex.test(create_password)) {
      validationErrors.password = 'weak';
      hasError = true;
    }

    if (create_password !== confirm_password) {
      validationErrors.password = 'mismatch';
      hasError = true;
    }

    // 4. Kötelező mezők meglétének ellenőrzése
    if (!keresztnev) { validationErrors.keresztnev = true; hasError = true; }
    if (!vezeteknev) { validationErrors.vezeteknev = true; hasError = true; }
    if (!username) { validationErrors.username = true; hasError = true; }

    // 5. Email formátum ellenőrzése reguláris kifejezéssel
    const emailRegex = /\S+@\S+\.\S+/;
    if (!email || !emailRegex.test(email)) {
      validationErrors.email = true;
      hasError = true;
    }

    // 6. Ha bármilyen validációs hiba történt, újrarendereljük az oldalt
    // Visszaküldjük a hibákat és a már kitöltött mezőket, hogy ne kelljen újra beírni mindent
    if (hasError) {
      return res.render('register', {
        ...validationErrors,
        username_val: username,
        email_val: email,
        vezeteknev_val: vezeteknev,
        keresztnev_val: keresztnev
      });
    }

    // 7. Biztonság: Jelszó titkosítása (Hashing)
    // A 'salt' hozzáadása segít a szivárgások elleni védelemben
    const salt = await bcrypt.genSalt(10);
    const encryptedPass = await bcrypt.hash(create_password, salt);
    
    // 8. Adatbázisba mentés előkészítése
    const fullName = `${vezeteknev} ${keresztnev}`.trim();
    const newUser = [[username, fullName, email, encryptedPass]];
    const query = 'INSERT INTO user (username, name, email, password) VALUES ?';
    const [code, result] = await connectDB(query, [newUser]);

    // 9. Adatbázis szintű hibák kezelése (pl. UNIQUE constraint sértés)
    if (code === 1) {
      const errorMsg = result.sqlMessage ? String(result.sqlMessage) : '';
      
      // Megnézzük, hogy a hibaüzenet tartalmazza-e a foglalt mezők neveit
      if (errorMsg.includes("'email'")) validationErrors.email = true;
      if (errorMsg.includes("'username'")) validationErrors.username = true;

      // Hiba esetén visszaküldés a regisztrációs lapra a hibaüzenetekkel
      return res.render('register', {
        ...validationErrors,
        username_val: username,
        email_val: email,
        vezeteknev_val: vezeteknev,
        keresztnev_val: keresztnev
      });
    }

    // 10. Sikeres regisztráció: Átirányítás a főoldalra
    res.redirect('/');

  } catch (error) {
    // 11. Váratlan szerverhiba esetén továbbpasszoljuk a hibát a globális hibakezelőnek
    next(error);
  }
};

module.exports = register;