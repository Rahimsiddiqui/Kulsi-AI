import { useState, useEffect, useCallback } from "react";
import { FolderType } from "../../server/config/types.js";
import {
  INITIAL_NOTE_ID,
  WELCOME_NOTE_CONTENT,
} from "../../server/config/constants.js";
import noteService from "../services/noteService.js";

// Generate unique IDs using better randomness
const generateId = () => {
  if (typeof window !== "undefined" && window.crypto?.getRandomValues) {
    return Math.random().toString(36).substring(2, 11);
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Helper to identify welcome note by title (since ID changes when saved to MongoDB)
const isWelcomeNote = (note) => {
  return note?.title === "Welcome to Kulsi AI";
};

const INITIAL_NOTES = [
  {
    id: INITIAL_NOTE_ID,
    title: "Welcome to Kulsi AI",
    content: WELCOME_NOTE_CONTENT,
    folderId: FolderType.ALL,
    isPinned: true,
    isArchived: false,
    tags: ["welcome", "guide"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

export const useNotes = () => {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);

  // Load notes on mount - fetch from MongoDB, fallback to localStorage
  useEffect(() => {
    const loadNotes = async () => {
      try {
        setIsLoading(true);
        setSyncError(null);

        // Check if token exists before trying to fetch from MongoDB
        const token = localStorage.getItem("token");
        if (!token) {
          // No token, use localStorage
          const saved = localStorage.getItem("kulsi-notes");
          const localNotes = saved ? JSON.parse(saved) : INITIAL_NOTES;
          const hasWelcomeNote = localNotes.some(isWelcomeNote);
          if (!hasWelcomeNote) {
            localNotes.unshift(INITIAL_NOTES[0]);
          }
          setNotes(localNotes);
          setIsLoading(false);
          return;
        }

        // Try to fetch from MongoDB
        const mongoNotes = await noteService.getNotes();

        // Transform MongoDB notes to include both id and mongoId
        const transformedNotes =
          mongoNotes && mongoNotes.length > 0
            ? mongoNotes.map((note) => ({
                ...note,
                id: note._id, // Map MongoDB _id to id field
                mongoId: note._id, // Keep mongoId for backend sync
              }))
            : [];

        // If MongoDB returns empty array (first login), use welcome note
        let notesToUse =
          transformedNotes.length > 0 ? transformedNotes : INITIAL_NOTES;

        // If first login (no notes in MongoDB), check if welcome note exists before saving
        if ((!mongoNotes || mongoNotes.length === 0) && notesToUse.length > 0) {
          try {
            // Check if welcome note already exists in MongoDB
            const allMongoNotes = await noteService.getNotes();
            const welcomeNoteExists = allMongoNotes.some(isWelcomeNote);

            if (!welcomeNoteExists) {
              // Create welcome note in MongoDB with correct format
              const welcomeNote = notesToUse[0];
              const mongoNote = {
                title: welcomeNote.title,
                content: welcomeNote.content,
                isPinned: welcomeNote.isPinned,
                isArchived: welcomeNote.isArchived,
                tags: welcomeNote.tags,
              };
              const created = await noteService.createNote(mongoNote);
              // Update local note with MongoDB ID
              notesToUse = notesToUse.map((n) =>
                n.id === welcomeNote.id ? { ...n, mongoId: created._id } : n
              );
            }
          } catch (err) {
            // If creating welcome note fails, just continue with local version
          }
        }

        // Ensure no duplicate welcome notes - deduplicate by title
        const seenTitles = new Set();
        notesToUse = notesToUse.filter((note) => {
          if (note.title === "Welcome to Kulsi AI") {
            if (seenTitles.has("Welcome to Kulsi AI")) {
              return false; // Skip duplicate
            }
            seenTitles.add("Welcome to Kulsi AI");
          }
          return true;
        });

        // Update both localStorage and state with notes
        localStorage.setItem("kulsi-notes", JSON.stringify(notesToUse));
        setNotes(notesToUse);
      } catch (error) {
        // Fallback to localStorage if API fails
        const saved = localStorage.getItem("kulsi-notes");
        const localNotes = saved ? JSON.parse(saved) : INITIAL_NOTES;

        // Ensure welcome note exists
        const hasWelcomeNote = localNotes.some(isWelcomeNote);
        if (!hasWelcomeNote) {
          localNotes.push(INITIAL_NOTES[0]);
        }

        setNotes(localNotes);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotes();
  }, []);

  // Sync notes to localStorage whenever they change
  useEffect(() => {
    if (notes.length > 0) {
      localStorage.setItem("kulsi-notes", JSON.stringify(notes));
    }
  }, [notes]);

  const addNote = useCallback((folderId = FolderType.PERSONAL, title = "") => {
    const newNote = {
      id: generateId(),
      title: title || "",
      content: "",
      folderId:
        folderId === FolderType.TRASH || folderId === FolderType.FAVORITES
          ? FolderType.PERSONAL
          : folderId,
      isPinned: false,
      isArchived: false,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setNotes((prev) => [newNote, ...prev]);

    // Async: Sync to MongoDB in background
    (async () => {
      try {
        // Convert to MongoDB format - MongoDB only stores title and content
        const mongoNote = {
          title: newNote.title || "Untitled Note",
          content: newNote.content,
          isPinned: newNote.isPinned,
          isArchived: newNote.isArchived,
          tags: newNote.tags,
        };
        const created = await noteService.createNote(mongoNote);

        // Update local note with MongoDB _id so future syncs use correct ID
        setNotes((prev) =>
          prev.map((n) =>
            n.id === newNote.id ? { ...n, mongoId: created._id } : n
          )
        );
      } catch (error) {
        console.error("Failed to sync new note to MongoDB:", error);
        setSyncError("Failed to save note to server");
      }
    })();

    return newNote.id;
  }, []);

  const updateNote = useCallback(
    (id, updates) => {
      setNotes((prev) =>
        prev.map((note) => (note.id === id ? { ...note, ...updates } : note))
      );

      // Async: Sync to MongoDB in background
      (async () => {
        try {
          // Convert to MongoDB format - only send fields that MongoDB supports
          const mongoUpdates = {};
          if (updates.title !== undefined) mongoUpdates.title = updates.title;
          if (updates.content !== undefined)
            mongoUpdates.content = updates.content;
          if (updates.isPinned !== undefined)
            mongoUpdates.isPinned = updates.isPinned;
          if (updates.isArchived !== undefined)
            mongoUpdates.isArchived = updates.isArchived;
          if (updates.tags !== undefined) mongoUpdates.tags = updates.tags;

          // Find the note to get its MongoDB ID
          const note = notes.find((n) => n.id === id);
          if (note && note.mongoId) {
            await noteService.updateNote(note.mongoId, mongoUpdates);
          }
        } catch (error) {
          console.error("Failed to sync note update to MongoDB:", error);
          setSyncError("Failed to save changes to server");
        }
      })();
    },
    [notes]
  );

  const deleteNote = useCallback(
    (id) => {
      // Permanent delete - remove from local state immediately
      setNotes((prev) => prev.filter((note) => note.id !== id));

      // Async: Sync deletion to MongoDB in background
      (async () => {
        try {
          const note = notes.find((n) => n.id === id);
          if (note && note.mongoId) {
            await noteService.deleteNote(note.mongoId);
          }
        } catch (error) {
          console.error("Failed to sync note deletion to MongoDB:", error);
          setSyncError("Failed to delete note on server");
          // Optionally, restore the note locally if MongoDB deletion fails
          // For now, just log the error
        }
      })();
    },
    [notes]
  );

  const restoreNote = useCallback(
    (id) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === id
            ? { ...note, folderId: FolderType.PERSONAL, updatedAt: Date.now() }
            : note
        )
      );

      // Async: Sync to MongoDB in background
      (async () => {
        try {
          const note = notes.find((n) => n.id === id);
          if (note && note.mongoId) {
            await noteService.updateNote(note.mongoId, {
              isArchived: false,
            });
          }
        } catch (error) {
          console.error("Failed to sync note restoration to MongoDB:", error);
          setSyncError("Failed to restore note on server");
        }
      })();
    },
    [notes]
  );

  return {
    notes,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    isLoading,
    syncError,
    setSyncError,
  };
};
