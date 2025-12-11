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
          const hasWelcomeNote = localNotes.some(
            (note) => note.id === INITIAL_NOTE_ID
          );
          if (!hasWelcomeNote) {
            localNotes.unshift(INITIAL_NOTES[0]);
          }
          setNotes(localNotes);
          setIsLoading(false);
          return;
        }

        // Try to fetch from MongoDB
        const mongoNotes = await noteService.getNotes();

        // If MongoDB returns empty array (first login), use welcome note
        const notesToUse =
          mongoNotes && mongoNotes.length > 0 ? mongoNotes : INITIAL_NOTES;

        // Update both localStorage and state with notes
        localStorage.setItem("kulsi-notes", JSON.stringify(notesToUse));
        setNotes(notesToUse);
      } catch (error) {
        // Fallback to localStorage if API fails
        console.warn(
          "Failed to fetch from MongoDB, using localStorage:",
          error
        );
        const saved = localStorage.getItem("kulsi-notes");
        const localNotes = saved ? JSON.parse(saved) : INITIAL_NOTES;

        // Ensure welcome note exists
        const hasWelcomeNote = localNotes.some(
          (note) => note.id === INITIAL_NOTE_ID
        );
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
      setNotes((prev) =>
        prev
          .map((note) => {
            if (note.id === id) {
              // If already in trash, permanent delete (filter out)
              if (note.folderId === FolderType.TRASH) {
                return null;
              }
              // Move to trash
              return {
                ...note,
                folderId: FolderType.TRASH,
                updatedAt: Date.now(),
              };
            }
            return note;
          })
          .filter(Boolean)
      );

      // Async: Sync to MongoDB in background
      (async () => {
        try {
          const note = notes.find((n) => n.id === id);
          if (note && note.mongoId) {
            await noteService.deleteNote(note.mongoId);
          }
        } catch (error) {
          console.error("Failed to sync note deletion to MongoDB:", error);
          setSyncError("Failed to delete note on server");
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
