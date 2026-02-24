const connectDB = require("../config/db");

const save = async (req, res) => {
  const { notes } = req.body;
  console.log("save payload:", req.body);
  const user = req.session.user;
 
  if (!user || !user.id) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
 
  /*if (!notes) {
    return res.status(400).json({ status: "error", message: "Notes are required" });
  }*/
 
  if (!Array.isArray(notes) || notes.length === 0) {
    return res.status(400).json({ status: "error", message: "Notes are required" });
  }
  const decodedNotes = notes;   
  //const decodedNotes = JSON.parse(notes);
  //if(decodedNotes.length === 0) {
  //  return res.status(400).json({ status: "error", message: "Notes are required" });
  //}

  const uniqueTags = [...new Set(
    decodedNotes.flatMap(note => note.tags || [])
  )];

  if (uniqueTags.length > 0) {
    const tagInsertQueries = uniqueTags.map(tag => 
      connectDB('INSERT IGNORE INTO tag (name) VALUES (?)', [tag.trim()])
    );

    try {
      await Promise.all(tagInsertQueries);
    } catch (error) {
      return res.status(500).json({ status: "error", message: error.message });
    }
  }
  try {
    for (const noteData of decodedNotes) {
      const [noteInsertError, noteResult] = await connectDB(
        'INSERT INTO note (user_id, title, content, creation_date, modification_date) VALUES (?, ?, ?, ?, ?)', 
        [
          user.id,
          noteData.title,
          noteData.content,
          new Date(noteData.createdAt),
          new Date(noteData.createdAt)
        ]
      );

      if (noteInsertError) {
        throw noteInsertError;
      }

      const noteId = noteResult.insertId;

      if (noteData.tags && noteData.tags.length > 0) {
        for (const tagName of noteData.tags) {
          const [findTagError, tagResult] = await connectDB(
            'SELECT id FROM tag WHERE name = ?', 
            [tagName.trim()]
          );

          if (findTagError || tagResult.length === 0) {
            continue;
          }

          const tagId = tagResult[0].id;

          await connectDB(
            'INSERT INTO note_tag (note_id, tag_id) VALUES (?, ?)', 
            [noteId, tagId]
          );
        }
      }
    }

    res.status(201).json({ status: "success", message: "Notes saved successfully" });
  } catch (error) {
    console.error('Save notes error:', error);
    res.status(500).json({ status: "error", message: "Failed to save notes" });
  }
};


const list = async (req, res) => {
  const user = req.session.user;
 
  if (!user || !user.id) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
 
  try {
    const [notesError, notesResult] = await connectDB(
      'SELECT * FROM note WHERE user_id = ?', 
      [user.id]
    );

    if (notesError) {
      throw notesError;
    }

    const notes = notesResult.map(note => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: [],
      createdAt: note.creation_date,
      updatedAt: note.modification_date
    }));

    res.status(200).json({ status: "success", notes });
  } catch (error) {
    console.error('List notes error:', error);
    res.status(500).json({ status: "error", message: "Failed to list notes" });
  }
};

module.exports = { 
  save, 
  list
};

const remove = async (req, res) => {
  const { id } = req.body;
  const user = req.session.user;
  console.log('delete payload:', req.body, 'user:', req.session && req.session.user ? { id: req.session.user.id, username: req.session.user.username } : null);

  if (!user || !user.id) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  if (!id) {
    return res.status(400).json({ status: "error", message: "Note id is required" });
  }

  try {
    // remove any note-tag relations first (no ON DELETE CASCADE in schema)
    const [delTagErr, delTagRes] = await connectDB('DELETE FROM note_tag WHERE note_id = ?', [id]);
    console.log('delete note_tag result:', delTagErr, delTagRes);
    if (delTagErr) {
      console.error('DB error while deleting note_tag', delTagRes);
      throw delTagRes;
    }

    // delete note only if it belongs to the logged-in user
    const [delNoteErr, delNoteRes] = await connectDB('DELETE FROM note WHERE id = ? AND user_id = ?', [id, user.id]);
    console.log('delete note result:', delNoteErr, delNoteRes);
    if (delNoteErr) {
      console.error('DB error while deleting note', delNoteRes);
      throw delNoteRes;
    }

    if (!delNoteRes || delNoteRes.affectedRows === 0) {
      console.log('Delete attempt affected 0 rows, note not found or not permitted', { id, userId: user.id });
      return res.status(404).json({ status: "error", message: "Note not found or not permitted" });
    }

    return res.status(200).json({ status: "success", message: "Note deleted" });
  } catch (error) {
    console.error('Delete note error:', error);
    return res.status(500).json({ status: "error", message: "Failed to delete note" });
  }
};

module.exports = { 
  save, 
  list,
  remove
};
