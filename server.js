const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const logger = require('morgan');
const router = require("./modules/routes");
const session = require("express-session");

//dotenv.config();

const app = express();

// Port beállítása
const port = process.env.PORT || 3000;

// Public mappa elérhetővé tétele
app.use(express.static('assets'));

// Session middleware hozzáadása
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

app.use(logger('dev'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", router);

app.listen(port, () => {
  console.log(`🚀 | A szerver fut a http://localhost:${port} címen!`);
});
