const { connectDB, getConnection } = require("../config/db"); 
const sanitizer = require('../modules/inputSanitizer');

const getNotesByUserId = async (userId) => {
  // SQL lekérdezés: Összekapcsolja a 'note', 'note_tag' és 'tag' táblákat
  // A GROUP_CONCAT egybefűzi a címkéket egy stringbe '||' elválasztóval
  const query = `
    SELECT n.id, n.title, n.content, n.creation_date, n.modification_date,
    GROUP_CONCAT(t.name SEPARATOR '||') AS tags
    FROM note n
    LEFT JOIN note_tag nt ON nt.note_id = n.id
    LEFT JOIN tag t ON t.id = nt.tag_id
    WHERE n.user_id = ?
    GROUP BY n.id
    ORDER BY n.modification_date DESC`;
  
  const [err, result] = await connectDB(query, [userId]);
  if (err) throw err;
  
  // Az adatbázisból jövő nyers adatokat "szép", a frontend számára emészthető objektumokká alakítja
  return result.map(note => ({
    id: note.id,
    title: note.title,
    content: note.content,
    tags: note.tags ? note.tags.split('||').filter(Boolean) : [],
    createdAt: note.creation_date,
    updatedAt: note.modification_date
  }));
};

const save = async (req, res, next) => {
  const { notes } = req.body; // A kliensről érkező jegyzetek tömbje
  const user = req.session.user;

  // Jogosultság és alapvető adatok ellenőrzése
  if (!user || !user.id) return res.status(401).json({ status: "error", message: "Unauthorized" });
  if (!Array.isArray(notes) || notes.length === 0) return res.status(400).json({ status: "error", message: "Notes are required" });

  const connection = await getConnection(); // Egyedi kapcsolat kérése a tranzakcióhoz
  
  try {
    // TRANZAKCIÓ INDÍTÁSA: Innentől a módosítások csak "ideiglenesek" a commit-ig
    await new Promise((resolve, reject) => {
      connection.beginTransaction(err => err ? reject(err) : resolve());
    });

    for (const rawNote of notes) {
      // 1. ADATOK TISZTÍTÁSA
      const title = sanitizer.sanitizeText(rawNote.title || '', sanitizer.MAX_TITLE_LENGTH);
      const content = sanitizer.sanitizeText(rawNote.content || '', sanitizer.MAX_CONTENT_LENGTH);
      const tags = sanitizer.sanitizeTags(rawNote.tags || []);

      let noteId = rawNote.id;

      if (noteId) {
        // MÁR LÉTEZŐ JEGYZET: Frissítés (UPDATE)
        const updateQuery = 'UPDATE note SET title = ?, content = ?, modification_date = ? WHERE id = ? AND user_id = ?';
        await new Promise((resolve, reject) => {
          connection.query(updateQuery, [title, content, new Date(), noteId, user.id], (err, res) => {
            if (err || res.affectedRows === 0) reject(err || new Error('Note not found or not permitted'));
            else resolve();
          });
        });
        
        // CÍMKÉK RESETELÉSE: Töröljük a régi kapcsolatait, hogy tiszta lappal újraírhassuk
        await new Promise((resolve, reject) => {
          connection.query('DELETE FROM note_tag WHERE note_id = ?', [noteId], err => err ? reject(err) : resolve());
        });
      } else {
        // ÚJ JEGYZET: Beszúrás (INSERT)
        const insertQuery = 'INSERT INTO note (user_id, title, content, creation_date, modification_date) VALUES (?, ?, ?, ?, ?)';
        noteId = await new Promise((resolve, reject) => {
          connection.query(insertQuery, [user.id, title, content, new Date(), new Date()], (err, res) => {
            if (err) reject(err);
            else resolve(res.insertId); // Elmentjük az újonnan generált ID-t
          });
        });
      }

      // 2. CÍMKÉK ÚJRAKÖTÉSE (Many-to-Many kezelés)
      for (const tagName of tags) {
        // INSERT IGNORE: Ha a címke már létezik a 'tag' táblában, nem csinál semmit, nincs hiba
        await new Promise((resolve, reject) => {
          connection.query('INSERT IGNORE INTO tag (name) VALUES (?)', [tagName], err => err ? reject(err) : resolve());
        });
        
        // Megkeressük az (új vagy régi) címke ID-ját
        const tagId = await new Promise((resolve, reject) => {
          connection.query('SELECT id FROM tag WHERE name = ?', [tagName], (err, res) => {
            if (err || res.length === 0) reject(err || new Error('Tag error'));
            else resolve(res[0].id);
          });
        });

        // Összekötjük a jegyzetet a címkével a kapcsolótáblában
        await new Promise((resolve, reject) => {
          connection.query('INSERT INTO note_tag (note_id, tag_id) VALUES (?, ?)', [noteId, tagId], err => err ? reject(err) : resolve());
        });
      }
    }

    // HA MINDEN SIKERÜLT: Véglegesítjük a tranzakciót az adatbázisban
    await new Promise((resolve, reject) => {
      connection.commit(err => err ? reject(err) : resolve());
    });

    // Visszaküldjük a friss listát
    const updatedNotes = await getNotesByUserId(user.id);
    res.status(200).json({ status: 'success', notes: updatedNotes });

  } catch (error) {
    // HIBA ESETÉN: Visszavonunk minden eddigi módosítást a ciklusból (ROLLBACK)
    await new Promise(resolve => connection.rollback(() => resolve()));
    next(error); 
  } finally {
    connection.release(); // Fontos: a kapcsolatot visszaadjuk a pool-ba
  }
};

// LISTÁZÁS: Egyszerűen meghívja a segédfüggvényt
const list = async (req, res, next) => {
  const user = req.session.user;
  if (!user || !user.id) return res.status(401).json({ status: "error", message: "Unauthorized" });

  try {
    const notes = await getNotesByUserId(user.id);
    res.status(200).json({ status: "success", notes });
  } catch (error) {
    next(error);
  }
};

// TÖRLÉS: Két lépcsős folyamat
const remove = async (req, res) => {
  const { id } = req.body;
  const user = req.session.user;

  // ... ellenőrzések ...

  try {
    // 1. Először a kapcsolótáblából töröljük a címke-kapcsolatokat (idegen kulcs kényszer miatt)
    await connectDB('DELETE FROM note_tag WHERE note_id = ?', [id]);

    // 2. Töröljük magát a jegyzetet, de csak ha a bejelentkezett felhasználóé
    const [err, result] = await connectDB('DELETE FROM note WHERE id = ? AND user_id = ?', [id, user.id]);

    if (err) throw err;
    if (!result || result.affectedRows === 0) {
      return res.status(404).json({ status: "error", message: "Note not found or not permitted" });
    }

    return res.status(200).json({ status: "success", message: "Note deleted" });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({ status: "error", message: "Failed to delete note" });
  }
};

module.exports = { save, list, remove };
