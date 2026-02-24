const { password } = require("../config/config");
const connectDB = require("../config/db")
const bcrypt = require('bcryptjs')

const login = async (req, res, next) => {
    const { username, password } = req.body;

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
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ message: 'Nem sikerült kijelentkezni' });
      }
      res.redirect('/login');
    });
};

module.exports = { 
    login,
    logout
};