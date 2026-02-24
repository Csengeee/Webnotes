const express = require("express");
const dotenv = require("dotenv").config();
const cors = require("cors");
const logger = require('morgan');
const appLogger = require('./modules/logger')
const errorHandler = require('./modules/errorHandler')
const router = require("./modules/routes");
const session = require("express-session");

//dotenv.config();

const app = express();

// Port beállítása
const port = process.env.PORT || 3000;

// Public mappa elérhetővé tétele
app.use(express.static('assets'));

// Session middleware hozzáadása
// Trust proxy when in production (if behind reverse proxy) so secure cookies work
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Optional MySQL session store (install express-mysql-session in production)
let sessionStore;
try {
  const MySQLStore = require('express-mysql-session')(session);
  const dbConfig = require('./config/config');
  sessionStore = new MySQLStore(dbConfig);
  console.log('Session store: using MySQL store');
} catch (e) {
  // if module not installed, fall back to default MemoryStore (not for production)
  console.log('Session store: MySQL store not available, using default store. Install express-mysql-session for production.');
}

app.use(session({
  // Kötelezővé tesszük a SESSION_SECRET meglétét
  secret: process.env.SESSION_SECRET, 
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true, // Megvédi a cookie-t a kliens oldali scriptektől
    secure: process.env.NODE_ENV === 'production', // Csak HTTPS-en keresztül küldi el élesben
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 nap
  }
}));

app.use(logger('dev'));
app.set('view engine', 'ejs');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", router);

// central error handler (should be registered after routes)
app.use(errorHandler)

app.listen(port, () => {
  appLogger.info(`Server started on http://localhost:${port}`)
  console.log(`🚀 | A szerver fut a http://localhost:${port} címen!`);
});
