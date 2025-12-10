import { useState, useEffect, useCallback } from "react";
import { FolderType } from "../../server/config/types.js";
import {
  INITIAL_NOTE_ID,
  WELCOME_NOTE_CONTENT,
} from "../../server/config/constants.js";

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
  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("kulsi-notes");
    let parsedNotes = saved ? JSON.parse(saved) : INITIAL_NOTES;

    // Only update welcome note if it's missing - don't overwrite user content
    const hasWelcomeNote = parsedNotes.some(
      (note) => note.id === INITIAL_NOTE_ID
    );
    if (!hasWelcomeNote) {
      parsedNotes.push(INITIAL_NOTES[0]);
    }

    return parsedNotes;
  });

  useEffect(() => {
    localStorage.setItem("kulsi-notes", JSON.stringify(notes));
  }, [notes]);

  const addNote = useCallback((folderId = FolderType.PERSONAL) => {
    const newNote = {
      id: generateId(),
      title: "",
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
    return newNote.id;
  }, []);

  const updateNote = useCallback((id, updates) => {
    setNotes((prev) =>
      prev.map((note) => (note.id === id ? { ...note, ...updates } : note))
    );
  }, []);

  const deleteNote = useCallback((id) => {
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
  }, []);

  const restoreNote = useCallback((id) => {
    setNotes((prev) =>
      prev.map((note) =>
        note.id === id
          ? { ...note, folderId: FolderType.PERSONAL, updatedAt: Date.now() }
          : note
      )
    );
  }, []);

  return { notes, addNote, updateNote, deleteNote, restoreNote };
};
