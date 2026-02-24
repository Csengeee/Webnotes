const express = require("express");
const router = express.Router();

const rcontroller = require("../controllers/RegisterController.js")
const lcontroller = require("../controllers/LoginController.js");
const ncontroller = require("../controllers/NotesController.js");

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

router.get('/notes/list', ncontroller.list);

router.get('/login', lcontroller.login);

router.get('/register', (req, res) => {
  res.render('register');
});


router.get('/logout', lcontroller.logout);

// ######## POST kérések ########

router.post('/login', lcontroller.login);

router.post('/register', function (req, res, next) {
  rcontroller(req, res, next)
});

router.post('/notes/save', ncontroller.save);

module.exports = router;