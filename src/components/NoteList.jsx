import React, { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Search,
  Pin,
  FileText,
  ChevronRight,
  PanelLeftClose,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NoteList = ({
  notes,
  selectedNoteId,
  onSelectNote,
  folderName,
  onToggle,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredNotes = useMemo(() => {
    return notes
      .filter(
        (note) =>
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .sort((a, b) => Number(b.isPinned) - Number(a.isPinned)); // Pinned first
  }, [notes, searchQuery]);

  return (
    <div className="w-full h-full bg-gray-50/50 flex flex-col z-10">
      <div className="p-4 pt-6 border-b border-gray-100 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
            {folderName}
          </h2>
          <button
            onClick={onToggle}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="Close List"
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>
        <div className="relative group">
          <Search className="absolute left-3 -bottom-[2.5px] transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 hover:border-gray-300 focus:bg-white focus:border-indigo-500/50 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200 shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
        {filteredNotes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-48 text-gray-400"
          >
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <FileText className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium">No notes found</p>
          </motion.div>
        ) : (
          <AnimatePresence>
            {filteredNotes.map((note, i) => (
              <motion.button
                layoutId={`note-${note.id}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                key={note.id}
                onClick={() => onSelectNote(note.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 group relative border shadow-sm ${
                  selectedNoteId === note.id
                    ? "bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500/20 z-10"
                    : "bg-white border-gray-200 hover:border-indigo-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className={`font-semibold text-sm truncate pr-2 ${
                      selectedNoteId === note.id
                        ? "text-indigo-900"
                        : "text-gray-900"
                    }`}
                  >
                    {note.title || "Untitled Note"}
                  </h3>
                  {note.isPinned && (
                    <Pin className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5 fill-amber-500" />
                  )}
                </div>

                <p className="text-xs text-gray-500 mb-3 line-clamp-2 h-8 leading-relaxed">
                  {note.content.replace(/[#*`>]/g, "") || "No additional text"}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {formatDistanceToNow(note.updatedAt, { addSuffix: true })}
                    </span>
                    {note.tags.length > 0 && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                        #{note.tags[0]}
                      </span>
                    )}
                  </div>
                  {selectedNoteId === note.id && (
                    <ChevronRight className="w-3 h-3 text-indigo-500" />
                  )}
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default NoteList;
