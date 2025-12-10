import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
  Sparkles,
  Clock,
  Bold,
  Italic,
  List,
  CheckSquare,
  PenTool,
  Trash2,
  Pin,
  Code,
  Underline,
  Strikethrough,
  Heading,
  Quote,
  Columns,
  Undo,
  Redo,
  Link as LinkIcon,
  PanelLeftOpen,
} from "lucide-react";
import { generateNoteEnhancement } from "../services/geminiService";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import TipTapEditor from "./TipTapEditor.jsx";

const MAX_HISTORY = 50;

const Editor = ({
  note = {},
  onUpdate = () => {},
  onDelete = () => {},
  onSelectNote = () => {},
  notes = [],
  isSidebarOpen,
  isNoteListOpen,
  onToggleSidebar = () => {},
  onToggleNoteList = () => {},
}) => {
  // Helper to ensure content is always a string
  const ensureString = (value) => {
    if (typeof value === "string") return value;
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "[Invalid content]";
      }
    }
    return String(value);
  };

  // Local state
  const [title, setTitle] = useState(note.title || "");
  const [content, setContent] = useState(ensureString(note.content));
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);

  // History stack state
  const [history, setHistory] = useState([ensureString(note.content)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Debug logging
  useEffect(() => {
    if (content && typeof content !== "string") {
      console.warn("⚠️ WARNING: content is not a string!", {
        type: typeof content,
        value: content,
        stringified: String(content),
      });
    }
  }, [content]);

  const aiMenuRef = useRef(null);
  const tiptapRef = useRef(null);
  const isMountedRef = useRef(true);

  // Ensure we don't set state on unmounted component
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Sync when active note changes (but preserve local edits)
  useEffect(() => {
    // Only sync when note ID changes, not on every content change
    setTitle(note.title || "");
    setContent(ensureString(note.content));
    setHistory([ensureString(note.content)]);
    setHistoryIndex(0);
  }, [note?.id]);

  // Debounced autosave
  useEffect(() => {
    if (typeof onUpdate !== "function") return;
    if (!note?.id) return; // Don't save if note ID is missing

    const handler = setTimeout(() => {
      try {
        if (title !== (note.title || "") || content !== (note.content || "")) {
          onUpdate(note.id, { title, content, updatedAt: Date.now() });
        }
      } catch (err) {
        // swallow errors but log in dev
        // eslint-disable-next-line no-console
        console.error("Autosave failed:", err);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [title, content, note.id, note.title, note.content, onUpdate]);

  // Close AI menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target)) {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update content and maintain history in a safe, functional way
  const updateContentWithHistory = useCallback(
    (newContent) => {
      setContent((prevContent) => {
        // Support both string and function parameters
        const resolvedContent =
          typeof newContent === "function"
            ? newContent(prevContent)
            : newContent;

        // Ensure resolved content is always a string
        const normalizedContent = ensureString(resolvedContent);

        if (normalizedContent === prevContent) return prevContent;

        setHistory((prevHistory) => {
          // trim any "future" entries if we've undone some changes
          const base = prevHistory.slice(0, historyIndex + 1);
          base.push(normalizedContent);

          // enforce max length
          if (base.length > MAX_HISTORY) {
            base.shift();
          }

          // update index after history is updated
          setHistoryIndex(base.length - 1);
          return base;
        });

        return normalizedContent;
      });
    },
    [historyIndex]
  );

  const undo = useCallback(() => {
    setHistoryIndex((idx) => {
      const newIndex = Math.max(0, idx - 1);
      setContent((_) => history[newIndex] ?? "");
      return newIndex;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex((idx) => {
      const newIndex = Math.min(history.length - 1, idx + 1);
      setContent((_) => history[newIndex] ?? "");
      return newIndex;
    });
  }, [history]);

  const handlePaste = useCallback((e) => {
    // TipTap handles paste automatically, converting HTML to markdown
    // This is here for any custom paste logic if needed
  }, []);

  const handleAiAction = useCallback(
    async (action) => {
      setAiMenuOpen(false);
      setIsAiLoading(true);
      try {
        const result = await generateNoteEnhancement(action, content || "");
        if (!result) throw new Error("No result from AI service");

        if (action === "continue" || action === "make_todo") {
          updateContentWithHistory((content || "") + "\n\n" + result);
          toast.success("Content generated!");
        } else if (action === "auto_tag") {
          const newTags = result.split(",").map((t) => t.trim().toLowerCase());
          const mergedTags = Array.from(
            new Set([...(note.tags || []), ...newTags])
          );
          onUpdate(note.id, { tags: mergedTags });
          toast.success(`Added tags: ${newTags.join(", ")}`);
        } else {
          if (action === "fix_grammar" || action === "improve") {
            updateContentWithHistory(result);
            toast.success("Content improved!");
          } else if (action === "summarize") {
            updateContentWithHistory(
              `**Summary:**\n${result}\n\n---\n\n${content || ""}`
            );
            toast.success("Summary added!");
          }
        }
      } catch (error) {
        // show the user a helpful message
        toast.error("Failed to generate AI content. Try again later.");
        // eslint-disable-next-line no-console
        console.error("AI action failed:", error);
      } finally {
        if (isMountedRef.current) setIsAiLoading(false);
      }
    },
    [content, note.tags, note.id, onUpdate, updateContentWithHistory]
  );

  const handleKeyDown = useCallback(
    (e) => {
      // Check if we're in an input field that shouldn't have shortcuts
      if (e.target === document.querySelector('input[name="title"]')) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Bold: Ctrl/Cmd + B
      if (modKey && e.key === "b") {
        e.preventDefault();
        tiptapRef.current?.insertText("**", "**");
      }
      // Italic: Ctrl/Cmd + I
      else if (modKey && e.key === "i") {
        e.preventDefault();
        tiptapRef.current?.insertText("*", "*");
      }
      // Underline: Ctrl/Cmd + U
      else if (modKey && e.key === "u") {
        e.preventDefault();
        tiptapRef.current?.insertText("__", "__");
      }
      // Strikethrough: Ctrl/Cmd + Shift + X
      else if (modKey && e.shiftKey && e.key === "X") {
        e.preventDefault();
        tiptapRef.current?.insertText("~~", "~~");
      }
      // Inline Code: Ctrl/Cmd + `
      else if (modKey && e.key === "`") {
        e.preventDefault();
        tiptapRef.current?.insertText("`", "`");
      }
      // Heading 2: Ctrl/Cmd + Alt + 1
      else if (modKey && e.altKey && e.key === "1") {
        e.preventDefault();
        tiptapRef.current?.setHeading(2);
      }
      // Heading 3: Ctrl/Cmd + Alt + 2
      else if (modKey && e.altKey && e.key === "2") {
        e.preventDefault();
        tiptapRef.current?.setHeading(3);
      }
      // Heading 4: Ctrl/Cmd + Alt + 3
      else if (modKey && e.altKey && e.key === "3") {
        e.preventDefault();
        tiptapRef.current?.setHeading(4);
      }
      // Heading 5: Ctrl/Cmd + Alt + 4
      else if (modKey && e.altKey && e.key === "4") {
        e.preventDefault();
        tiptapRef.current?.setHeading(5);
      }
      // Heading 6: Ctrl/Cmd + Alt + 5
      else if (modKey && e.altKey && e.key === "5") {
        e.preventDefault();
        tiptapRef.current?.setHeading(6);
      }
      // Block Ctrl/Cmd + Alt + 6 (not supported)
      else if (modKey && e.altKey && e.key === "6") {
        e.preventDefault();
        return;
      }
      // Blockquote: Ctrl/Cmd + Shift + .
      else if (modKey && e.shiftKey && e.key === ">") {
        e.preventDefault();
        tiptapRef.current?.insertBlock("> ");
      }
      // Checkbox: Ctrl/Cmd + Shift + C
      else if (modKey && e.shiftKey && e.key === "C") {
        e.preventDefault();
        tiptapRef.current?.toggleTaskList();
      }
      // Bullet List: Ctrl/Cmd + Shift + L
      else if (modKey && e.shiftKey && e.key === "L") {
        e.preventDefault();
        tiptapRef.current?.toggleBulletList();
      }
      // Drawing: Ctrl/Cmd + Shift + D
      else if (modKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setShowDrawingModal(true);
      }
      // Undo: Ctrl/Cmd + Z (TipTap handles this natively, but ensure it works)
      else if (modKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Redo: Ctrl/Cmd + Shift + Z
      else if (modKey && e.shiftKey && e.key === "Z") {
        e.preventDefault();
        redo();
      }
    },
    [undo, redo]
  );

  // Global keyboard shortcuts listener
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Ignore if user is in title input
      if (e.target.tagName === "INPUT" && e.target.name === "title") {
        return;
      }
      handleKeyDown(e);
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleKeyDown]);

  const handleDrop = useCallback(
    (e) => {
      try {
        e.preventDefault();
        const files = Array.from(e.dataTransfer?.files || []);
        if (files.length === 0) return;
        const file = files[0];
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64 = event.target?.result;
            if (base64)
              updateContentWithHistory(
                (c) => (c || "") + `\n![${file.name}](${base64})\n`
              );
          };
          reader.readAsDataURL(file);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Drop handling error:", err);
      }
    },
    [updateContentWithHistory]
  );

  // parseInline memoized for performance
  const parseInline = useMemo(() => {
    return (text) => {
      if (!text) return [];
      const parts = text.split(
        /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`|\[\[.*?\]\]|~~.*?~~|<u>.*?<\/u>)/g
      );
      return parts.map((part, i) => {
        if (
          part.startsWith("***") &&
          part.endsWith("***") &&
          part.length >= 6
        ) {
          return (
            <strong key={i} className="font-bold text-gray-900">
              <em className="text-gray-800">
                {parseInline(part.slice(3, -3))}
              </em>
            </strong>
          );
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
          return (
            <strong key={i} className="font-bold text-gray-900">
              {parseInline(part.slice(2, -2))}
            </strong>
          );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
          return (
            <em key={i} className="text-gray-800">
              {parseInline(part.slice(1, -1))}
            </em>
          );
        }
        if (part.startsWith("~~") && part.endsWith("~~") && part.length >= 4) {
          return (
            <s key={i} className="text-gray-400 decoration-gray-400">
              {parseInline(part.slice(2, -2))}
            </s>
          );
        }
        if (
          part.startsWith("<u>") &&
          part.endsWith("</u>") &&
          part.length >= 7
        ) {
          return (
            <u key={i} className="decoration-indigo-300 underline-offset-2">
              {parseInline(part.slice(3, -4))}
            </u>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="bg-gray-100 text-pink-600 rounded px-1.5 py-0.5 font-mono text-sm border border-gray-200"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("[[") && part.endsWith("]]")) {
          const linkTarget = part.slice(2, -2);
          const targetNote = notes.find(
            (n) => n.title?.toLowerCase() === linkTarget?.toLowerCase()
          );
          return (
            <span
              key={i}
              onClick={() => {
                if (targetNote) onSelectNote(targetNote.id);
                else toast.error(`Note "${linkTarget}" not found.`);
              }}
              className="text-indigo-600 font-medium hover:underline decoration-indigo-300 cursor-pointer bg-indigo-50 px-1 rounded hover:bg-indigo-100"
              aria-label={`Link to note ${linkTarget}`}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  if (targetNote) onSelectNote(targetNote.id);
                  else toast.error(`Note "${linkTarget}" not found.`);
                }
              }}
            >
              {linkTarget}
            </span>
          );
        }
        return part;
      });
    };
  }, [notes, onSelectNote]);

  // Drawing modal component (kept local for convenience)
  const DrawingModal = () => {
    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const [lineWidth, setLineWidth] = useState(3);
    const [lineColor, setLineColor] = useState("#000000");

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = lineColor;
      }
    }, [lineWidth, lineColor]);

    const getPos = useCallback((e, canvas) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if (e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const ratio = window.devicePixelRatio || 1;
      return {
        x: (clientX - rect.left) * (canvas.width / (rect.width * ratio)),
        y: (clientY - rect.top) * (canvas.height / (rect.height * ratio)),
      };
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const start = (e) => {
        isDrawingRef.current = true;
        const { x, y } = getPos(e, canvas);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        ctx.moveTo(x, y);
        e.preventDefault();
      };

      const move = (e) => {
        if (!isDrawingRef.current) return;
        const { x, y } = getPos(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
        e.preventDefault();
      };

      const stop = () => {
        isDrawingRef.current = false;
        ctx.beginPath();
      };

      canvas.addEventListener("mousedown", start);
      canvas.addEventListener("mousemove", move);
      canvas.addEventListener("mouseup", stop);
      canvas.addEventListener("mouseleave", stop);
      canvas.addEventListener("touchstart", start, { passive: false });
      canvas.addEventListener("touchmove", move, { passive: false });
      canvas.addEventListener("touchend", stop);

      return () => {
        canvas.removeEventListener("mousedown", start);
        canvas.removeEventListener("mousemove", move);
        canvas.removeEventListener("mouseup", stop);
        canvas.removeEventListener("mouseleave", stop);
        canvas.removeEventListener("touchstart", start);
        canvas.removeEventListener("touchmove", move);
        canvas.removeEventListener("touchend", stop);
      };
    }, [getPos, lineWidth, lineColor]);

    const saveDrawing = () => {
      try {
        const data = canvasRef.current?.toDataURL("image/png");
        if (data) {
          updateContentWithHistory((c) => (c || "") + `\n![Sketch](${data})\n`);
          setShowDrawingModal(false);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Save drawing failed:", err);
        toast.error("Failed to insert drawing.");
      }
    };

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-2xl shadow-2xl max-w-full max-h-[90vh] overflow-hidden flex flex-col w-full lg:w-4xl"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-linear-to-r from-indigo-50 to-blue-50">
            <h3 className="text-xl font-bold text-gray-800">Drawing Canvas</h3>
            <button
              onClick={() => setShowDrawingModal(false)}
              className="text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              aria-label="Close drawing modal"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 flex flex-col p-6 gap-4 overflow-y-auto">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 items-center pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Brush Size:
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="w-28 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm text-gray-600 font-medium min-w-10">
                  {lineWidth}px
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Color:
                </label>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="w-12 h-10 rounded cursor-pointer border-2 border-gray-300 hover:border-indigo-400 transition-colors"
                />
              </div>
              <button
                onClick={clearCanvas}
                className="ml-auto px-4 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Clear Canvas
              </button>
            </div>

            {/* Canvas */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg shadow-inner cursor-crosshair overflow-hidden touch-none bg-white flex-1 flex items-center justify-center min-h-[450px]">
              <canvas ref={canvasRef} className="w-full h-full max-w-2xl" />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => setShowDrawingModal(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveDrawing}
              className="px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium shadow-md transition-colors"
            >
              Insert Drawing
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const MarkdownPreview = useCallback(
    ({ text }) => {
      const lines = (text || "").split("\n");
      const rendered = [];
      let currentListItems = [];
      let currentListType = null; // 'bullet' or 'numbered'

      const flushList = () => {
        if (currentListItems.length === 0) return;
        const key = `list-${rendered.length}`;
        if (currentListType === "numbered") {
          rendered.push(
            <ol
              key={key}
              className="ml-4 list-decimal marker:text-gray-400 my-2 space-y-1"
            >
              {currentListItems}
            </ol>
          );
        } else {
          rendered.push(
            <ul
              key={key}
              className="ml-4 list-disc marker:text-gray-400 my-2 space-y-1"
            >
              {currentListItems}
            </ul>
          );
        }
        currentListItems = [];
        currentListType = null;
      };

      let i = 0;
      while (i < lines.length) {
        const line = lines[i];

        // images
        const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
        if (imgMatch) {
          flushList();
          rendered.push(
            <div key={`img-${i}`} className="flex justify-center my-6">
              <img
                src={imgMatch[2]}
                alt={imgMatch[1]}
                className="max-w-full rounded-xl shadow-md border border-gray-100"
              />
            </div>
          );
          i++;
          continue;
        }

        // headings
        if (line.startsWith("# ")) {
          flushList();
          rendered.push(
            <h1
              key={i}
              className="text-4xl font-bold mb-2 mt-4 text-gray-900 leading-tight"
            >
              {parseInline(line.substring(2))}
            </h1>
          );
          i++;
          continue;
        }
        if (line.startsWith("## ")) {
          flushList();
          rendered.push(
            <h2
              key={i}
              className="text-2xl font-bold mb-2 mt-3 text-gray-800 leading-snug"
            >
              {parseInline(line.substring(3))}
            </h2>
          );
          i++;
          continue;
        }
        if (line.startsWith("### ")) {
          flushList();
          rendered.push(
            <h3
              key={i}
              className="text-xl font-semibold mb-1 mt-2 text-gray-800"
            >
              {parseInline(line.substring(4))}
            </h3>
          );
          i++;
          continue;
        }

        // checkboxes (unchecked: [ ] without dash)
        if (line.trim().startsWith("[ ] ")) {
          flushList();
          rendered.push(
            <div key={i} className="flex items-start space-x-3 my-2">
              <div className="shrink-0 mt-1.5 w-4 h-4 rounded border border-gray-300 bg-white" />
              <span className="text-gray-700">
                {parseInline(line.replace("[ ] ", ""))}
              </span>
            </div>
          );
          i++;
          continue;
        }
        if (line.trim().startsWith("[x] ")) {
          flushList();
          rendered.push(
            <div key={i} className="flex items-start space-x-3 my-2 opacity-60">
              <div className="shrink-0 mt-1.5 w-4 h-4 rounded border border-indigo-400 bg-indigo-500 flex items-center justify-center">
                <CheckSquare className="w-3 h-3 text-white" />
              </div>
              <span className="text-gray-500 line-through">
                {parseInline(line.replace("[x] ", ""))}
              </span>
            </div>
          );
          i++;
          continue;
        }

        // bullet lists (only regular items with dash, not checkboxes)
        if (line.trim().startsWith("- ")) {
          if (currentListType !== "bullet") {
            flushList();
            currentListType = "bullet";
          }
          currentListItems.push(
            <li key={i} className="text-gray-700">
              {parseInline(line.substring(2))}
            </li>
          );
          i++;
          continue;
        }

        // numbered lists
        if (line.trim().match(/^\d+\. /)) {
          if (currentListType !== "numbered") {
            flushList();
            currentListType = "numbered";
          }
          currentListItems.push(
            <li key={i} className="text-gray-700">
              {parseInline(line.replace(/^\d+\. /, ""))}
            </li>
          );
          i++;
          continue;
        }

        // blockquotes
        if (line.startsWith("> ")) {
          flushList();
          rendered.push(
            <blockquote
              key={i}
              className="border-l-4 border-indigo-300 pl-4 py-1 my-2 text-gray-600 bg-gray-50/50 italic rounded-r"
            >
              {parseInline(line.substring(2))}
            </blockquote>
          );
          i++;
          continue;
        }

        // code blocks
        if (line.trim().startsWith("```")) {
          flushList();
          let codeBlockContent = "";
          i++;
          while (i < lines.length && !lines[i].trim().startsWith("```")) {
            codeBlockContent += lines[i] + "\n";
            i++;
          }
          i++;
          rendered.push(
            <pre
              key={`code-${i}`}
              className="bg-gray-800 text-gray-200 p-4 rounded-lg my-4 font-mono text-sm overflow-x-auto shadow-inner border border-gray-700"
            >
              <code>{codeBlockContent.trim()}</code>
            </pre>
          );
          continue;
        }

        // empty lines
        if (line.trim() === "") {
          flushList();
          rendered.push(<div key={i} className="h-4" />);
          i++;
          continue;
        }

        // paragraphs
        flushList();
        rendered.push(
          <p key={i} className="mb-3 leading-8 text-gray-800">
            {parseInline(line)}
          </p>
        );
        i++;
      }

      flushList();

      return (
        <div className="prose prose-lg prose-indigo max-w-none text-gray-800 pb-20">
          {rendered}
        </div>
      );
    },
    [parseInline]
  );

  // Toolbar button helper
  const ToolbarBtn = ({
    onClick,
    icon: Icon,
    active = false,
    title,
    ariaLabel,
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [buttonRect, setButtonRect] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipTimeoutRef = useRef(null);
    const buttonRef = useRef(null);

    const handleMouseEnter = () => {
      setIsHovered(true);
      if (buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
    };

    const handleMouseLeave = () => {
      setIsHovered(false);
      setShowTooltip(false);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };

    return (
      <>
        <button
          ref={buttonRef}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // Focus the editor first
            tiptapRef.current?.focus?.();
            // Then execute the action
            onClick(e);
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className={`p-2.5 rounded-lg transition-all active:scale-95 shrink-0 ${
            active
              ? "bg-indigo-100 text-indigo-700 shadow-sm"
              : "text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          }`}
          aria-label={ariaLabel || title}
          type="button"
        >
          <Icon className="w-4 h-4" />
        </button>

        {showTooltip &&
          buttonRect &&
          createPortal(
            <div
              className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50"
              style={{
                top: `${buttonRect.top + buttonRect.height / 2}px`,
                left: `${buttonRect.right + 12}px`,
                transform: "translateY(-50%)",
                animation: "fadeIn 0.3s ease-out forwards",
              }}
            >
              {title}
            </div>,
            document.body
          )}
      </>
    );
  };

  // Heading dropdown component
  const HeadingDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [hoveredHeading, setHoveredHeading] = useState(null);
    const [buttonRect, setButtonRect] = useState(null);
    const [hoveredButtonRect, setHoveredButtonRect] = useState(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const buttonRef = useRef(null);
    const headingButtonRefs = useRef({});
    const tooltipTimeoutRef = useRef(null);

    const headings = [
      {
        level: 2,
        label: "H₁",
        displayLabel: "Heading 1",
        shortcut: "Ctrl+Alt+1",
        diffClass1: true,
        diffClass2: false,
      },
      {
        level: 3,
        label: "H₂",
        displayLabel: "Heading 2",
        shortcut: "Ctrl+Alt+2",
        diffClass1: false,
        diffClass2: false,
      },
      {
        level: 4,
        label: "H₃",
        displayLabel: "Heading 3",
        shortcut: "Ctrl+Alt+3",
        diffClass1: false,
        diffClass2: false,
      },
      {
        level: 5,
        label: "H₄",
        displayLabel: "Heading 4",
        shortcut: "Ctrl+Alt+4",
        diffClass1: false,
        diffClass2: false,
      },
      {
        level: 6,
        label: "H₅",
        displayLabel: "Heading 5",
        shortcut: "Ctrl+Alt+5",
        diffClass1: false,
        diffClass2: true,
      },
    ];

    const handleSelectHeading = (level) => {
      tiptapRef.current?.focus?.();
      tiptapRef.current?.setHeading(level);
      setIsOpen(false);
    };

    const handleButtonClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
      setIsOpen(!isOpen);
    };

    const handleButtonMouseEnter = () => {
      if (buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
    };

    const handleButtonMouseLeave = () => {
      setShowTooltip(false);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e) => {
        if (buttonRef.current && !buttonRef.current.contains(e.target)) {
          setIsOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
      <>
        <button
          ref={buttonRef}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onClick={handleButtonClick}
          onMouseEnter={handleButtonMouseEnter}
          onMouseLeave={handleButtonMouseLeave}
          className="p-2.5 rounded-lg transition-all active:scale-95 shrink-0 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
          aria-label="Select Heading"
          type="button"
        >
          <Heading className="w-4 h-4" />
        </button>

        {isOpen &&
          buttonRect &&
          createPortal(
            <div
              className="fixed bg-white rounded-lg shadow-lg border border-gray-200"
              style={{
                top: `${buttonRect.bottom + 8}px`,
                left: `${buttonRect.left - 2}px`,
                zIndex: 150,
                maxWidth: "46px",
              }}
            >
              {headings.map((heading) => (
                <div key={heading.level} className="relative group/item">
                  <button
                    ref={(el) => {
                      if (el) headingButtonRefs.current[heading.level] = el;
                    }}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSelectHeading(heading.level);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredHeading(heading.level);
                      if (e.currentTarget) {
                        setHoveredButtonRect(
                          e.currentTarget.getBoundingClientRect()
                        );
                      }
                    }}
                    onMouseLeave={() => setHoveredHeading(null)}
                    className={`px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 ${
                      heading.diffClass1
                        ? "rounded-t-lg"
                        : heading.diffClass2 && "rounded-b-lg"
                    } transition-colors flex items-center justify-center gap-1 w-full`}
                    type="button"
                  >
                    <span className="font-medium text-sm">{heading.label}</span>
                  </button>

                  {/* Tooltip on hover */}
                  {hoveredHeading === heading.level && hoveredButtonRect && (
                    <div
                      className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50"
                      style={{
                        top: `${
                          hoveredButtonRect.top + hoveredButtonRect.height / 2
                        }px`,
                        left: `${hoveredButtonRect.right + 12}px`,
                        transform: "translateY(-50%)",
                        animation: "fadeIn 0.5s ease-out forwards",
                      }}
                    >
                      {heading.displayLabel}
                    </div>
                  )}
                </div>
              ))}
            </div>,
            document.body
          )}

        {showTooltip &&
          buttonRect &&
          createPortal(
            <div
              className="fixed bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50"
              style={{
                top: `${buttonRect.top + buttonRect.height / 2}px`,
                left: `${buttonRect.right + 12}px`,
                transform: "translateY(-50%)",
                animation: "fadeIn 0.5s ease-out forwards",
              }}
            >
              Select Heading
            </div>,
            document.body
          )}
      </>
    );
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {showDrawingModal && <DrawingModal />}

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white/95 backdrop-blur z-20 sticky top-0">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center space-x-1 mr-2">
            {!isNoteListOpen && (
              <button
                onClick={onToggleNoteList}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Open Note List"
                aria-label="Open note list"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="text-xs text-gray-400 flex flex-col truncate">
            <span className="font-semibold text-gray-900 truncate max-w-[150px] md:max-w-xs text-sm">
              {title || "Untitled"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />{" "}
              {format(new Date(note?.updatedAt || Date.now()), "MMM d, p")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <div className="h-6 w-px bg-gray-200 hidden md:block" />

          <div className="flex items-center space-x-1">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
              aria-label="Undo (Cmd+Z)"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
              aria-label="Redo (Cmd+Shift+Z)"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
              note?.isPinned
                ? "text-indigo-600 bg-indigo-50"
                : "text-gray-400 hover:text-gray-700"
            }`}
            aria-label={note?.isPinned ? "Unpin note" : "Pin note"}
            title={note?.isPinned ? "Unpin note" : "Pin note"}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
            aria-label="Delete note"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center space-x-0.5 px-4 md:px-6 py-3 border-b border-gray-100 bg-linear-to-b from-white to-gray-50 backdrop-blur overflow-x-auto overflow-y-visible scrollbar-hide z-10 sticky top-[61px] w-full shadow-sm">
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("**", "**")}
          icon={Bold}
          title="Bold (Cmd/Ctrl+B)"
          ariaLabel="Bold (Cmd/Ctrl+B)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("*", "*")}
          icon={Italic}
          title="Italic (Cmd/Ctrl+I)"
          ariaLabel="Italic (Cmd/Ctrl+I)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("__", "__")}
          icon={Underline}
          title="Underline (Cmd/Ctrl+U)"
          ariaLabel="Underline (Cmd/Ctrl+U)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("~~", "~~")}
          icon={Strikethrough}
          title="Strikethrough (Cmd/Ctrl+Shift+X)"
          ariaLabel="Strikethrough (Cmd/Ctrl+Shift+X)"
        />
        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
        <HeadingDropdown />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertBlock("> ")}
          icon={Quote}
          title="Quote (Cmd/Ctrl+Shift+>)"
          ariaLabel="Quote (Cmd/Ctrl+Shift+>)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("`", "`")}
          icon={Code}
          title="Inline Code (Cmd/Ctrl+`)"
          ariaLabel="Inline Code (Cmd/Ctrl+`)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("[", "](url)")}
          icon={LinkIcon}
          title="Link - Type [text](url)"
          ariaLabel="Insert link - Type [text](url)"
        />
        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.toggleTaskList()}
          icon={CheckSquare}
          title="Checkbox (Cmd/Ctrl+Shift+C)"
          ariaLabel="Checkbox (Cmd/Ctrl+Shift+C)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.toggleBulletList()}
          icon={List}
          title="Bullet List (Cmd/Ctrl+Shift+L)"
          ariaLabel="Bullet List (Cmd/Ctrl+Shift+L)"
        />
        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
        <ToolbarBtn
          onClick={() => setShowDrawingModal(true)}
          icon={PenTool}
          title="Draw (Cmd/Ctrl+Shift+D)"
          ariaLabel="Draw (Cmd/Ctrl+Shift+D)"
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-y-auto bg-white">
          <div className="max-w-5xl w-full px-6 py-10 md:px-12 flex-1 flex flex-col">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="w-full text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none focus:ring-0 bg-transparent mb-6 tracking-tight"
            />
            <TipTapEditor
              key={note.id}
              ref={tiptapRef}
              value={content}
              onChange={(newContent) => updateContentWithHistory(newContent)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder="Start writing..."
            />
          </div>
        </div>
      </div>

      {/* Floating AI Toolbar */}
      <div
        className="absolute bottom-6 right-6 md:bottom-8 md:right-8 z-30"
        ref={aiMenuRef}
      >
        <AnimatePresence>
          {aiMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-64 mb-2 origin-bottom-right"
            >
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-3 py-2 mb-1">
                AI Assistant
              </div>
              <button
                onClick={() => handleAiAction("improve")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Improve writing with AI"
              >
                <Sparkles className="w-4 h-4" /> Improve Writing
              </button>
              <button
                onClick={() => handleAiAction("fix_grammar")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Fix grammar with AI"
              >
                <CheckSquare className="w-4 h-4" /> Fix Grammar
              </button>
              <button
                onClick={() => handleAiAction("make_todo")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Generate to-do list from content"
              >
                <List className="w-4 h-4" /> Generate To-Do List
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleAiAction("summarize")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Summarize content with AI"
              >
                <Columns className="w-4 h-4" /> Summarize
              </button>
              <button
                onClick={() => handleAiAction("continue")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Continue writing with AI"
              >
                <PenTool className="w-4 h-4" /> Continue Writing
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setAiMenuOpen(!aiMenuOpen)}
          disabled={isAiLoading}
          className={`w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl shadow-gray-400/50 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 hover:bg-black ${
            isAiLoading ? "animate-pulse cursor-wait" : ""
          }`}
          aria-label={aiMenuOpen ? "Close AI assistant" : "Open AI assistant"}
          title={aiMenuOpen ? "Close AI assistant" : "Open AI assistant"}
        >
          <Sparkles className="w-6 h-6 text-yellow-300 fill-current" />
        </button>
      </div>
    </div>
  );
};

export default Editor;
