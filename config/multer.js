const multer = require('multer');
const path = require('path');
const fs = require('fs');


// Ellenőrizzük, hogy létezik-e a mappa, ha nem, létrehozzuk
const uploadDir = './public/uploads/';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/'); // A mentés helye[cite: 1]
    },
    filename: function (req, file, cb) {
        // Egyedi fájlnév generálása időbélyeggel[cite: 1, 2]
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

module.exports = upload; // Exportáljuk, hogy máshol használható legyen