import express from "express";
import Note from "../models/Note.js";
import { verifyToken } from "../utils/jwt.js";

const router = express.Router();

// Middleware to verify user is authenticated
const authMiddleware = async (req, res, next) => {
  try {
    const JWT_SECRET = process.env.JWT_SECRET;

    if (!JWT_SECRET) {
      return res
        .status(500)
        .json({ message: "Server configuration error: JWT_SECRET not set" });
    }

    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      console.warn("[NOTES AUTH] No token provided in request");
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = verifyToken(token);
    req.userId = decoded.id || decoded.userId;
    next();
  } catch (error) {
    console.error("[NOTES AUTH] Token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Apply auth middleware to all routes
router.use(authMiddleware);

// GET /api/notes - Get all notes for the user
router.get("/", async (req, res) => {
  try {
    const notes = await Note.find({
      userId: req.userId,
      isTrashed: false,
    })
      .sort({ isPinned: -1, updatedAt: -1 })
      .exec();
    res.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

// GET /api/notes/:id - Get single note
router.get("/:id", async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      userId: req.userId,
    });
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(note);
  } catch (error) {
    console.error("Error fetching note:", error);
    res.status(500).json({ error: "Failed to fetch note" });
  }
});

// POST /api/notes - Create new note
router.post("/", async (req, res) => {
  try {
    const { title, content, tags, color } = req.body;
    const note = new Note({
      userId: req.userId,
      title: title || "Untitled Note",
      content: content || "",
      tags: tags || [],
      color: color || "default",
    });
    await note.save();
    res.status(201).json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ error: "Failed to create note" });
  }
});

// PUT /api/notes/:id - Update note
router.put("/:id", async (req, res) => {
  try {
    const { title, content, isPinned, isArchived, tags, color } = req.body;
    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      {
        $set: {
          title,
          content,
          isPinned,
          isArchived,
          tags,
          color,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true }
    );
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(note);
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ error: "Failed to update note" });
  }
});

// DELETE /api/notes/:id - Delete note (soft delete to trash)
router.delete("/:id", async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      { $set: { isTrashed: true, updatedAt: new Date() } },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(note);
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ error: "Failed to delete note" });
  }
});

// POST /api/notes/:id/restore - Restore note from trash
router.post("/:id/restore", async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.userId,
      },
      { $set: { isTrashed: false, updatedAt: new Date() } },
      { new: true }
    );
    if (!note) {
      return res.status(404).json({ error: "Note not found" });
    }
    res.json(note);
  } catch (error) {
    console.error("Error restoring note:", error);
    res.status(500).json({ error: "Failed to restore note" });
  }
});

export default router;
