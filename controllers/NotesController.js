const { connectDB } = require("../config/db"); 
const sanitizer = require('../modules/inputSanitizer');

// Segédfüggvény a jegyzetek egységes lekéréséhez
const getNotesByUserId = async (userId) => {
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
  const { notes } = req.body;
  const user = req.session.user;

  if (!user || !user.id) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  if (!Array.isArray(notes) || notes.length === 0) {
    return res.status(400).json({ status: "error", message: "Notes are required" });
  }

  const connection = await getConnection();
  
  try {
    // Tranzakció indítása a biztonságos mentéshez
    await new Promise((resolve, reject) => {
      connection.beginTransaction(err => err ? reject(err) : resolve());
    });

    for (const rawNote of notes) {
      const title = sanitizer.sanitizeText(rawNote.title || '', sanitizer.MAX_TITLE_LENGTH);
      const content = sanitizer.sanitizeText(rawNote.content || '', sanitizer.MAX_CONTENT_LENGTH);
      const tags = sanitizer.sanitizeTags(rawNote.tags || []);

      let noteId = rawNote.id;

      if (noteId) {
        // 1. Jegyzet frissítése (mindig ellenőrizzük a user_id-t!)
        const updateQuery = 'UPDATE note SET title = ?, content = ?, modification_date = ? WHERE id = ? AND user_id = ?';
        await new Promise((resolve, reject) => {
          connection.query(updateQuery, [title, content, new Date(), noteId, user.id], (err, res) => {
            if (err || res.affectedRows === 0) reject(err || new Error('Note not found or not permitted'));
            else resolve();
          });
        });
        
        // 2. KRITIKUS JAVÍTÁS: Régi címkekapcsolatok törlése az újrakötés előtt
        await new Promise((resolve, reject) => {
          connection.query('DELETE FROM note_tag WHERE note_id = ?', [noteId], err => err ? reject(err) : resolve());
        });
      } else {
        // Új jegyzet beszúrása
        const insertQuery = 'INSERT INTO note (user_id, title, content, creation_date, modification_date) VALUES (?, ?, ?, ?, ?)';
        noteId = await new Promise((resolve, reject) => {
          connection.query(insertQuery, [user.id, title, content, new Date(), new Date()], (err, res) => {
            if (err) reject(err);
            else resolve(res.insertId);
          });
        });
      }

      // 3. Címkék feldolgozása és újrakötése
      for (const tagName of tags) {
        // Biztosítjuk, hogy a címke létezik a tag táblában
        await new Promise((resolve, reject) => {
          connection.query('INSERT IGNORE INTO tag (name) VALUES (?)', [tagName], err => err ? reject(err) : resolve());
        });
        
        // Lekérjük a címke ID-ját
        const tagId = await new Promise((resolve, reject) => {
          connection.query('SELECT id FROM tag WHERE name = ?', [tagName], (err, res) => {
            if (err || res.length === 0) reject(err || new Error('Tag error'));
            else resolve(res[0].id);
          });
        });

        // Új kapcsolat létrehozása a jegyzet és a címke között
        await new Promise((resolve, reject) => {
          connection.query('INSERT INTO note_tag (note_id, tag_id) VALUES (?, ?)', [noteId, tagId], err => err ? reject(err) : resolve());
        });
      }
    }

    // Tranzakció véglegesítése
    await new Promise((resolve, reject) => {
      connection.commit(err => err ? reject(err) : resolve());
    });

    // Frissített lista lekérése és visszaküldése
    const updatedNotes = await getNotesByUserId(user.id);
    res.status(200).json({ status: 'success', notes: updatedNotes });

  } catch (error) {
    // Hiba esetén minden módosítás visszagörgetése
    await new Promise(resolve => connection.rollback(() => resolve()));
    next(error); 
  } finally {
    connection.release(); // Kapcsolat felszabadítása
  }
};

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

const remove = async (req, res) => {
  const { id } = req.body;
  const user = req.session.user;

  if (!user || !user.id) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  if (!id) {
    return res.status(400).json({ status: "error", message: "Note id is required" });
  }

  try {
    // Kapcsolatok törlése a kapcsolótáblából
    await connectDB('DELETE FROM note_tag WHERE note_id = ?', [id]);

    // Jegyzet törlése (ellenőrizve a tulajdonost)
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
