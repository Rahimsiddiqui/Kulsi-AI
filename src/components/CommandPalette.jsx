import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileText,
  Command,
  Moon,
  Sun,
  Plus,
  Layout,
  ArrowRight,
} from "lucide-react";

const CommandPalette = ({
  notes,
  onSelectNote,
  onCreateNote,
  onClose,
  isOpen,
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredItems = [
    {
      type: "action",
      id: "new-note",
      label: query ? `Create note "${query}"` : "Create New Note",
      icon: Plus,
      action: () => {
        // If user typed something, use it as the title
        if (query) {
          onCreateNote(query);
        } else {
          onCreateNote();
        }
      },
    },
    ...notes
      .filter((n) => {
        const query_lower = (query || "").toLowerCase();
        const title = (n.title || "").toLowerCase();
        const content = (n.content || "").toLowerCase();
        return title.includes(query_lower) || content.includes(query_lower);
      })
      .slice(0, 8)
      .map((n) => ({
        type: "note",
        id: n.id,
        label: n.title || "Untitled Note",
        icon: FileText,
        action: () => onSelectNote(n.id),
      })),
  ];

  // Reset selected index when filtered items change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredItems.length]);

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(
        (prev) => (prev - 1 + filteredItems.length) % filteredItems.length
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredItems[selectedIndex];
      if (item) {
        item.action();
        onClose();
      }
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh] transition-opacity duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-200 scale-100 border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-gray-100 px-4 py-3">
          <Search className="w-5 h-5 text-gray-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent text-lg text-gray-800 placeholder-gray-400 focus:outline-none"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="hidden sm:flex items-center space-x-1">
            <kbd className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 rounded">
              ESC
            </kbd>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No results found
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  className={`cursor-pointer w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${
                    idx === selectedIndex
                      ? "bg-indigo-50 text-indigo-900"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="flex items-center">
                    <Icon
                      className={`w-4 h-4 mr-3 ${
                        idx === selectedIndex
                          ? "text-indigo-600"
                          : "text-gray-400"
                      }`}
                    />
                    <span
                      className={idx === selectedIndex ? "font-medium" : ""}
                    >
                      {item.label}
                    </span>
                  </div>
                  {item.type === "action" && idx === selectedIndex && (
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="bg-gray-50 px-4 py-2 text-xs text-gray-400 border-t border-gray-100 flex justify-center">
          <span>
            Tip: Use{" "}
            <kbd className="font-mono bg-white px-1 border rounded">Up</kbd>{" "}
            <kbd className="font-mono bg-white px-1 border rounded">Down</kbd>{" "}
            to navigate
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
