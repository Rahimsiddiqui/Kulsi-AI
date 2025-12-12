import React, { useState, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const LinkModal = ({
  isOpen,
  onClose,
  onSubmit,
  selectedText = "",
  notes = [],
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const inputRef = useRef(null);

  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNoteSelect = (note) => {
    // Just select the note, don't submit yet
    setSelectedNote(note);
    setShowDropdown(false);
  };

  const handleConfirm = () => {
    if (!selectedNote) return;

    // Submit internal note link with selectedText as display text
    onSubmit(`[[${selectedNote.title}]]`, {
      noteId: selectedNote.id || selectedNote._id,
      type: "internal",
      displayText: selectedText, // Pass the selected text to use as visible link text
    });
    setSearchQuery("");
    setSelectedNote(null);
    setShowDropdown(false);
    // Delay onClose to allow fade-out animation
    setTimeout(() => onClose(), 300);
  };

  const handleCancel = () => {
    setSelectedNote(null);
    setSearchQuery("");
    setShowDropdown(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Add Link</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition point p-1 hover:bg-gray-100 rounded-lg"
            >
              <X size={20} />
            </button>
          </div>

          {selectedText && (
            <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
              <p className="text-sm text-gray-600">
                <span className="font-medium">Link text:</span>{" "}
                <span className="text-indigo-700 font-mono">
                  {selectedText}
                </span>
              </p>
            </div>
          )}

          <div className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Notes
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={selectedNote ? selectedNote.title : searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedNote(null);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Type note name..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                />
                <ChevronDown
                  size={18}
                  className="absolute right-3 top-3 text-gray-400 pointer-events-none"
                />
              </div>

              {/* Dropdown */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto"
                  >
                    {filteredNotes.length > 0 ? (
                      filteredNotes.map((note) => (
                        <button
                          key={note.id || note._id}
                          type="button"
                          onClick={() => handleNoteSelect(note)}
                          className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-b-0 point"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-900">
                              {note.title}
                            </span>
                            <span className="text-xs text-gray-500 ml-2 shrink-0">
                              {(note.id || note._id).slice(-8)}
                            </span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500 text-center">
                        {searchQuery
                          ? "No notes found"
                          : "Start typing to search"}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {searchQuery && (
                <p className="text-xs text-gray-500 mt-1">
                  {filteredNotes.length}{" "}
                  {filteredNotes.length === 1 ? "note" : "notes"} found
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors point"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!selectedNote}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors point"
              >
                Confirm
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LinkModal;
