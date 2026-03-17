const dotenv = require("dotenv").config();
const express = require("express");
const cors = require("cors");
const logger = require('morgan');
const appLogger = require('./modules/logger')
const errorHandler = require('./modules/errorHandler')
const router = require("./modules/routes");
const session = require("express-session");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 3000;

// Ellenőrizzük, hogy létezik-e a mappa, ha nem, létrehozzuk
const uploadDir = './public/uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    cb(null, 'img-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Statikus mappa kiszolgálása, hogy elérjük a képeket böngészőből
app.use('/uploads', express.static('public/uploads'));

// Feltöltési végpont
app.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).send('Nincs fájl.');
  res.json({ location: `/uploads/${req.file.filename}` });
});

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
  // Itt a javítás: ha a process.env.SESSION_SECRET üres, használja a fix szöveget
  secret: process.env.SESSION_SECRET || 'WebNotes_Fix_Titkos_Kulcs_123', 
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 
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
