const connectDB = require("../config/db");

const save = async (req, res) => {
  const { notes } = req.body;
  const user = req.session.user;
 
  if (!user || !user.id) {
    return res.status(401).json({ status: "error", message: "Beazonosítva" });
  }
 
  if (!notes) {
    return res.status(400).json({ status: "error", message: "Notes are required" });
  }
 
  const decodedNotes = JSON.parse(notes);
  if(decodedNotes.length === 0) {
    return res.status(400).json({ status: "error", message: "Notes are required" });
  }
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
        'INSERT INTO note (user_id, title, content, creation_date, modification_date) VALUES (?)', 
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
            'INSERT INTO note_tag (note_id, tag_id) VALUES (?)', 
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
