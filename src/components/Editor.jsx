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
  Copy,
  Save,
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // History stack state
  const [history, setHistory] = useState([ensureString(note.content)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Removed debug logging

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
      if (newIndex >= 0 && history.length > newIndex) {
        const previousContent = history[newIndex];
        setContent(previousContent);
      }
      return newIndex;
    });
  }, [history]);

  const redo = useCallback(() => {
    setHistoryIndex((idx) => {
      const newIndex = Math.min(history.length - 1, idx + 1);
      if (newIndex < history.length) {
        const nextContent = history[newIndex];
        setContent(nextContent);
      }
      return newIndex;
    });
  }, [history]);

  const handlePaste = useCallback(
    (e) => {
      // Safety check - ensure event exists and has clipboardData
      if (!e || !e.clipboardData) return;

      // Get pasted text from clipboard
      const pastedText = e.clipboardData.getData("text/plain") || "";

      if (!pastedText) return;

      // Check if pasted content has markdown markup (including headings)
      // Headings: # ## ### etc followed by space
      const hasMarkdown = /(\*\*|__|\*|_|~~|`|#+\s|\d+\.|^-\s|\[x?\]|>)/m.test(
        pastedText
      );

      if (hasMarkdown) {
        // Prevent default paste behavior
        e.preventDefault();

        // Insert the pasted markdown content into the editor
        // TipTap will automatically parse markdown and convert to rich text
        if (tiptapRef.current) {
          // Get current editor state and insert at cursor position
          tiptapRef.current.insertText("", "");
          // Insert the pasted content which will be parsed as markdown
          const currentContent = content || "";
          // Add a newline before pasted content to separate from existing text
          const newContent = currentContent
            ? currentContent + "\n" + pastedText
            : pastedText;
          updateContentWithHistory(newContent);
          toast.success("Markdown pasted and converted!");
        }
      }
      // If no markdown detected, let TipTap handle it normally
    },
    [content, updateContentWithHistory]
  );

  const handleCopy = useCallback(() => {
    // Copy the content WITH markup AND preserve all whitespace (including trailing spaces)
    if (content) {
      try {
        // Don't trim - preserve exact content with all spaces
        const contentToCopy = content;

        navigator.clipboard
          .writeText(contentToCopy)
          .then(() => {
            toast.success("Content successfully copied!");
          })
          .catch(() => {
            // Fallback for older browsers
            const textarea = document.createElement("textarea");
            textarea.value = contentToCopy;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
            toast.success("Content successfully copied!");
          });
      } catch (error) {
        toast.error("Failed to copy content");
      }
    }
  }, [content]);

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

  const handleSave = useCallback(() => {
    if (!note?.id) {
      toast.error("Cannot save: Note ID missing");
      return;
    }

    setIsSaving(true);

    try {
      console.log("Saving note:", {
        id: note.id,
        title,
        contentLength: content?.length || 0,
      });

      onUpdate(note.id, { title, content, updatedAt: Date.now() });

      // Reset saving state immediately since onUpdate is synchronous for local state
      setIsSaving(false);
      toast.success("Note saved successfully!");
    } catch (error) {
      console.error("Save error:", error);
      setIsSaving(false);
      toast.error("Failed to save note");
    }
  }, [note.id, title, content, onUpdate]);

  const handleKeyDown = useCallback(
    (e) => {
      // Check if we're in an input field that shouldn't have shortcuts
      if (e.target === document.querySelector('input[name="title"]')) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // Copy with Markup: Ctrl/Cmd + C (plain copy)
      // Only intercept copy if there's NO selection - let browser handle selected text
      if (modKey && e.key.toLowerCase() === "c" && !e.altKey && !e.shiftKey) {
        const hasSelection = window.getSelection().toString().length > 0;
        if (!hasSelection) {
          e.preventDefault();
          handleCopy();
        }
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
      // Copy with Markup: Ctrl/Cmd + Alt + C (alternative shortcut)
      else if (modKey && e.altKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopy();
      }
      // Drawing: Ctrl/Cmd + Shift + D
      else if (modKey && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        setShowDrawingModal(true);
      }
      // Link: Ctrl/Cmd + L
      else if (
        modKey &&
        e.key.toLowerCase() === "l" &&
        !e.altKey &&
        !e.shiftKey
      ) {
        e.preventDefault();
        if (!tiptapRef.current?.hasSelection()) {
          toast.warning("Select a word please!");
          return;
        }
        tiptapRef.current?.insertText("[", "](url)");
      }
      // Strikethrough: Ctrl/Cmd + Shift + X
      else if (modKey && e.shiftKey && e.key.toLowerCase() === "x") {
        e.preventDefault();
        tiptapRef.current?.insertText("~~", "~~");
      }
      // Checkbox: Ctrl/Cmd + Shift + C
      else if (modKey && e.shiftKey && e.key.toLowerCase() === "c") {
        e.preventDefault();
        tiptapRef.current?.toggleTaskList();
      }
    },
    [handleCopy]
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

    const handleCopyEvent = () => {
      // Show toast when user copies selected text
      const hasSelection = window.getSelection().toString().length > 0;
      if (hasSelection) {
        toast.success("Content successfully copied!");
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    window.addEventListener("copy", handleCopyEvent);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
      window.removeEventListener("copy", handleCopyEvent);
    };
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
    const [lineColor, setLineColor] = useState("#1f2937");
    const [isHovering, setIsHovering] = useState(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Use requestAnimationFrame to ensure DOM is fully laid out
      const initCanvas = () => {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;

        // Only set if canvas has actual dimensions
        if (rect.width > 0 && rect.height > 0) {
          canvas.width = Math.floor(rect.width * ratio);
          canvas.height = Math.floor(rect.height * ratio);

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
        }
      };

      // Try to init immediately, and again after a short delay
      initCanvas();
      const timer = setTimeout(initCanvas, 100);

      return () => clearTimeout(timer);
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
        if (isDrawingRef.current) {
          isDrawingRef.current = false;
          ctx.closePath();
        }
      };

      canvas.addEventListener("mousedown", start);
      canvas.addEventListener("mousemove", move);
      canvas.addEventListener("mouseup", stop);
      canvas.addEventListener("mouseleave", stop);
      canvas.addEventListener("touchstart", start, { passive: false });
      canvas.addEventListener("touchmove", move, { passive: false });
      canvas.addEventListener("touchend", stop);
      canvas.addEventListener("touchcancel", stop);

      return () => {
        canvas.removeEventListener("mousedown", start);
        canvas.removeEventListener("mousemove", move);
        canvas.removeEventListener("mouseup", stop);
        canvas.removeEventListener("mouseleave", stop);
        canvas.removeEventListener("touchstart", start);
        canvas.removeEventListener("touchmove", move);
        canvas.removeEventListener("touchend", stop);
        canvas.removeEventListener("touchcancel", stop);
      };
    }, [getPos, lineWidth, lineColor]);

    const saveDrawing = () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) {
          toast.error("Canvas not found. Please try again.");
          return;
        }

        // Verify canvas has been drawn on
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          toast.error("Canvas has no dimensions. Please try again.");
          return;
        }

        // Get canvas data URL
        let data;
        try {
          data = canvas.toDataURL("image/png");
          console.log("Canvas data URL length:", data.length);
        } catch (err) {
          console.error("Canvas export error:", err);
          toast.error("Failed to export drawing. Please try again.");
          return;
        }

        // Check if data URL is valid
        if (!data || data.length < 100 || data === "data:,") {
          console.warn("Invalid data URL:", data);
          toast.error("Drawing is empty. Please draw something first.");
          return;
        }

        // Insert the drawing as markdown image
        console.log("Inserting drawing into note...");
        updateContentWithHistory((c) => {
          const newContent = (c || "") + `\n![Sketch](${data})\n`;
          console.log("New content length:", newContent.length);
          return newContent;
        });
        setShowDrawingModal(false);
      } catch (err) {
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
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-xl shadow-xl max-w-full max-h-[90vh] overflow-hidden flex flex-col w-full lg:w-4xl"
        >
          <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900">
              Drawing Canvas
            </h3>
            <button
              onClick={() => setShowDrawingModal(false)}
              className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-200 transition-all active:scale-95"
              aria-label="Close drawing modal"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-0 overflow-hidden">
            {/* Controls */}
            <div className="flex flex-wrap gap-3 items-center px-5 py-3 border-b border-gray-100 bg-white shrink-0">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Size:
                </label>
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(parseInt(e.target.value))}
                  className="cursor-pointer w-24 h-2 bg-gray-200 hover:bg-gray-300 rounded-full appearance-none transition-colors"
                />
                <span className="text-xs text-gray-500 font-medium min-w-8 text-right -ml-[25px]">
                  {lineWidth}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Color:
                </label>
                <input
                  type="color"
                  value={lineColor}
                  onChange={(e) => setLineColor(e.target.value)}
                  className="cursor-pointer w-8 h-8 rounded border border-gray-300 hover:border-gray-400 transition-colors"
                />
              </div>
              <button
                onClick={clearCanvas}
                className="cursor-pointer ml-auto px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors active:scale-95"
              >
                Clear
              </button>
            </div>

            {/* Canvas - takes all remaining space */}
            <div
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className={`flex-1 border-0 overflow-hidden touch-none bg-white flex items-center justify-center transition-all ${
                isHovering ? "shadow-sm" : ""
              }`}
            >
              <canvas
                ref={canvasRef}
                className="cursor-crosshair w-full h-full"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 p-4 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => setShowDrawingModal(false)}
              className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={saveDrawing}
              className="cursor-pointer px-5 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-all active:scale-95 shadow-sm"
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

        // images - use greedy matching to handle data URLs with parentheses
        const imgMatch = line.match(/!\[(.*?)\]\((.+)\)$/);
        if (imgMatch) {
          flushList();
          const altText = imgMatch[1];
          const imgSrc = imgMatch[2];
          console.log("Image found:", { altText, srcLength: imgSrc.length });
          rendered.push(
            <div key={`img-${i}`} className="flex justify-center my-6">
              <img
                src={imgSrc}
                alt={altText}
                className="max-w-full rounded-xl shadow-md border border-gray-100"
              />
            </div>
          );
          i++;
          continue;
        }

        // If line looks like image markdown but isn't matching, log it for debugging
        if (line.includes("![") && line.includes("](")) {
          console.warn(
            "Line looks like image but didn't match regex:",
            line.substring(0, 100)
          );
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

  // Action button helper with tooltip - for top-right action icons
  const ActionBtn = ({
    onClick,
    icon: Icon,
    tooltip,
    ariaLabel,
    disabled = false,
    className = "",
    tooltipPosition = "right", // "right" or "bottom"
  }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [buttonRect, setButtonRect] = useState(null);
    const buttonRef = useRef(null);
    const tooltipTimeoutRef = useRef(null);

    const handleMouseEnter = () => {
      if (buttonRef.current) {
        setButtonRect(buttonRef.current.getBoundingClientRect());
      }
      tooltipTimeoutRef.current = setTimeout(() => {
        setShowTooltip(true);
      }, 500);
    };

    const handleMouseLeave = () => {
      setShowTooltip(false);
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };

    const getTooltipPosition = () => {
      if (!buttonRect) return {};
      if (tooltipPosition === "bottom") {
        return {
          top: `${buttonRect.bottom + 8}px`,
          left: `${buttonRect.left + buttonRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      }
      // default "right"
      return {
        top: `${buttonRect.top + buttonRect.height / 2}px`,
        left: `${buttonRect.right + 12}px`,
        transform: "translateY(-50%)",
      };
    };

    return (
      <>
        <button
          ref={buttonRef}
          onClick={onClick}
          disabled={disabled}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          aria-label={ariaLabel}
          className={`cursor-pointer transition-colors pointer-events-auto ${className}`}
          type="button"
        >
          <Icon className="w-4 h-4" />
        </button>

        {showTooltip &&
          buttonRect &&
          tooltip &&
          createPortal(
            <div
              className="fixed bg-gray-900 text-white text-xs px-2.5 py-1.5 rounded shadow-lg pointer-events-none"
              style={{
                ...getTooltipPosition(),
                animation: "fadeIn 0.3s ease-out forwards",
                whiteSpace: "nowrap",
                zIndex: 9999,
              }}
            >
              {tooltip}
            </div>,
            document.body
          )}
      </>
    );
  };

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
          className={`cursor-pointer p-2.5 rounded-lg transition-all active:scale-95 shrink-0 ${
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
          className="cursor-pointer p-2.5 rounded-lg transition-all active:scale-95 shrink-0 text-gray-600 hover:bg-gray-200 hover:text-gray-900"
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
                    className={`cursor-pointer px-3 py-2 text-left text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 ${
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm &&
        createPortal(
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
              onClick={() => setShowDeleteConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>

                <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
                  Delete note?
                </h3>

                <p className="text-sm text-gray-600 text-center mb-6">
                  This action cannot be undone. The note "{title || "Untitled"}"
                  will be permanently deleted.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="cursor-pointer flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      onDelete(note.id);
                    }}
                    className="cursor-pointer flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white/95 backdrop-blur z-20 sticky top-0">
        <div className="flex items-center space-x-3 overflow-hidden">
          <div className="flex items-center space-x-1 mr-2">
            {!isNoteListOpen && (
              <button
                onClick={onToggleNoteList}
                className="cursor-pointer p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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

          {note?.id && (
            <ActionBtn
              onClick={handleSave}
              icon={Save}
              disabled={isSaving || !title.trim()}
              tooltip="Save note"
              ariaLabel="Save note"
              className={`p-2 rounded-full transition-colors ${
                isSaving
                  ? "text-gray-400 opacity-50"
                  : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
              }`}
            />
          )}

          <div className="flex items-center space-x-1">
            <ActionBtn
              onClick={undo}
              icon={Undo}
              disabled={historyIndex <= 0}
              tooltip="Undo (Cmd/Ctrl+Z)"
              ariaLabel="Undo (Cmd/Ctrl+Z)"
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30"
            />
            <ActionBtn
              onClick={redo}
              icon={Redo}
              disabled={historyIndex >= history.length - 1}
              tooltip="Redo (Cmd/Ctrl+Shift+Z)"
              ariaLabel="Redo (Cmd/Ctrl+Shift+Z)"
              tooltipPosition="bottom"
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30"
            />
          </div>

          <ActionBtn
            onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })}
            icon={Pin}
            tooltip={note?.isPinned ? "Unpin note" : "Pin note"}
            ariaLabel={note?.isPinned ? "Unpin note" : "Pin note"}
            tooltipPosition="bottom"
            className={`p-2 rounded-full hover:bg-gray-100 ${
              note?.isPinned
                ? "text-indigo-600 bg-indigo-50"
                : "text-gray-400 hover:text-gray-700"
            }`}
          />
          <ActionBtn
            onClick={handleCopy}
            icon={Copy}
            tooltip="Copy content (Cmd/Ctrl+C)"
            ariaLabel="Copy content (Cmd/Ctrl+C)"
            tooltipPosition="bottom"
            className="p-2 rounded-full hover:bg-blue-50 text-gray-400 hover:text-blue-600"
          />
          <ActionBtn
            onClick={() => setShowDeleteConfirm(true)}
            icon={Trash2}
            tooltip="Delete note"
            ariaLabel="Delete note"
            tooltipPosition="bottom"
            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600"
          />
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
          title="Quote (Cmd/Ctrl+Shift+B)"
          ariaLabel="Quote (Cmd/Ctrl+Shift+B)"
        />
        <ToolbarBtn
          onClick={() => tiptapRef.current?.insertText("`", "`")}
          icon={Code}
          title="Inline Code (Cmd/Ctrl+`)"
          ariaLabel="Inline Code (Cmd/Ctrl+`)"
        />
        <ToolbarBtn
          onClick={() => {
            if (!tiptapRef.current?.hasSelection()) {
              toast.warning("Select a word please!");
              return;
            }
            tiptapRef.current?.insertText("[", "](url)");
          }}
          icon={LinkIcon}
          title="Link - (Cmd/Ctrl+L)"
          ariaLabel="Insert link - (Cmd/Ctrl+L)"
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
                className="cursor-pointer w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Improve writing with AI"
              >
                <Sparkles className="w-4 h-4" /> Improve Writing
              </button>
              <button
                onClick={() => handleAiAction("fix_grammar")}
                className="cursor-pointer w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Fix grammar with AI"
              >
                <CheckSquare className="w-4 h-4" /> Fix Grammar
              </button>
              <button
                onClick={() => handleAiAction("make_todo")}
                className="cursor-pointer w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Generate to-do list from content"
              >
                <List className="w-4 h-4" /> Generate To-Do List
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleAiAction("summarize")}
                className="cursor-pointer w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
                aria-label="Summarize content with AI"
              >
                <Columns className="w-4 h-4" /> Summarize
              </button>
              <button
                onClick={() => handleAiAction("continue")}
                className="cursor-pointer w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
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
          className={`cursor-pointer w-14 h-14 bg-gray-900 text-white rounded-full shadow-xl shadow-gray-400/50 flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 hover:bg-black ${
            isAiLoading ? "animate-pulse cursor-wait" : ""
          }`}
          aria-label={aiMenuOpen ? "Close AI assistant" : "Open AI assistant"}
        >
          <Sparkles className="w-6 h-6 text-yellow-300 fill-current" />
        </button>
      </div>
    </div>
  );
};

export default Editor;
