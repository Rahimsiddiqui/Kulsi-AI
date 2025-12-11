/**
 * Note Service - Handles API calls for notes CRUD operations
 * Provides abstraction layer between components and backend API
 */

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

const noteService = {
  /**
   * Fetch all notes for the current user
   */
  async getNotes() {
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch notes");
      return await response.json();
    } catch (error) {
      console.error("Error fetching notes:", error);
      throw error;
    }
  },

  /**
   * Fetch a single note by ID
   */
  async getNoteById(id) {
    try {
      const response = await fetch(`${API_BASE}/notes/${id}`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch note");
      return await response.json();
    } catch (error) {
      console.error("Error fetching note:", error);
      throw error;
    }
  },

  /**
   * Create a new note
   */
  async createNote(note) {
    try {
      const response = await fetch(`${API_BASE}/notes`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(note),
      });
      if (!response.ok) throw new Error("Failed to create note");
      return await response.json();
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  },

  /**
   * Update an existing note
   */
  async updateNote(id, updates) {
    try {
      const response = await fetch(`${API_BASE}/notes/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        credentials: "include",
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error("Failed to update note");
      return await response.json();
    } catch (error) {
      console.error("Error updating note:", error);
      throw error;
    }
  },

  /**
   * Delete a note (soft delete to trash)
   */
  async deleteNote(id) {
    try {
      const response = await fetch(`${API_BASE}/notes/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete note");
      return await response.json();
    } catch (error) {
      console.error("Error deleting note:", error);
      throw error;
    }
  },

  /**
   * Restore a note from trash
   */
  async restoreNote(id) {
    try {
      const response = await fetch(`${API_BASE}/notes/${id}/restore`, {
        method: "POST",
        headers: getAuthHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to restore note");
      return await response.json();
    } catch (error) {
      console.error("Error restoring note:", error);
      throw error;
    }
  },
};

export default noteService;
