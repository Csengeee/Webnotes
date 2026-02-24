const express = require("express");
const router = express.Router();

const rcontroller = require("../controllers/RegisterController.js")
const lcontroller = require("../controllers/LoginController.js");
const ncontroller = require("../controllers/NotesController.js");
const { requireAuth } = require('./auth');
const connectDB = require('../config/db');

// ######## GET kérések ########

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    res.render('index', {
      user: req.session.user
    });
  } else {
    res.render('login');
  }
});

router.get('/notes/list', requireAuth, ncontroller.list);

router.get('/login', (req, res) => {
  res.render('login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

// modules/routes.js
router.get('/users', requireAuth, async (req, res) => {
  const [err, rows] = await connectDB('SELECT id, username, name, email FROM user');
  if (err) return res.status(500).send('DB hiba');
  res.render('users', { users: rows });
});


router.get('/logout', lcontroller.logout);

// ######## POST kérések ########

router.post('/login', lcontroller.login);

router.post('/register', function (req, res, next) {
  rcontroller(req, res, next)
});

router.post('/notes/save', requireAuth, ncontroller.save);
router.post('/notes/delete', requireAuth, ncontroller.remove); // fallback for clients that don't send body with DELETE
router.delete('/notes/delete', requireAuth, ncontroller.remove);

module.exports = router;