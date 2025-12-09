import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Clock,
  Bold,
  Italic,
  List,
  CheckSquare,
  Eye,
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
  Maximize2,
  PanelLeft,
  PanelLeftOpen,
  Layout,
} from "lucide-react";
import { generateNoteEnhancement } from "../services/geminiService";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import WYSIWYGEditor from "./WYSIWYGEditor.jsx";

const Editor = ({
  note,
  onUpdate,
  onDelete,
  onSelectNote,
  notes,
  isSidebarOpen,
  isNoteListOpen,
  onToggleSidebar,
  onToggleNoteList,
}) => {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiMenuOpen, setAiMenuOpen] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);

  // History Stack
  const [history, setHistory] = useState([note.content]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const aiMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const wysiwygRef = useRef(null);

  // Sync state when switching notes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setHistory([note.content]);
    setHistoryIndex(0);
  }, [note.id]);

  // Autosave
  useEffect(() => {
    const handler = setTimeout(() => {
      if (title !== note.title || content !== note.content) {
        onUpdate(note.id, { title, content, updatedAt: Date.now() });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [title, content, note.id, onUpdate]);

  // AI Menu close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (aiMenuRef.current && !aiMenuRef.current.contains(event.target)) {
        setAiMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateContentWithHistory = (newContent) => {
    if (newContent === content) return;

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);

    if (newHistory.length > 50) newHistory.shift();

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    setContent(newContent);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  };

  const insertText = (marker, closeMarker = marker) => {
    if (wysiwygRef.current) {
      wysiwygRef.current.insertText(marker, closeMarker);
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);

    const len = marker.length;
    const closeLen = closeMarker.length;

    // Check for wrapping
    const before = content.substring(start - len, start);
    const after = content.substring(end, end + closeLen);

    const isWrapped = before === marker && after === closeMarker;

    let shouldUnwrap = isWrapped;

    // Robust Collision Detection (Specifically for * vs **)
    if (marker === "*" && isWrapped) {
      const charPreBefore = content.substring(start - 2, start - 1);
      const charPostAfter = content.substring(end + 1, end + 2);
      const isActuallyInsideBold =
        charPreBefore === "*" && charPostAfter === "*";

      if (isActuallyInsideBold) {
        const charPrePreBefore = content.substring(start - 3, start - 2);
        const charPostPostAfter = content.substring(end + 2, end + 3);
        const isInsideBoldItalic =
          charPrePreBefore === "*" && charPostPostAfter === "*";
        if (!isInsideBoldItalic) {
          shouldUnwrap = false;
        }
      }
    }

    let newText = "";
    let newCursorStart = start;
    let newCursorEnd = end;

    if (shouldUnwrap) {
      // Remove formatting
      newText =
        content.substring(0, start - len) +
        selectedText +
        content.substring(end + closeLen);
      newCursorStart = start - len;
      newCursorEnd = end - len;
    } else {
      // Add formatting
      newText =
        content.substring(0, start) +
        marker +
        selectedText +
        closeMarker +
        content.substring(end);
      newCursorStart = start + len;
      newCursorEnd = end + len;
    }

    updateContentWithHistory(newText);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorStart, newCursorEnd);
      }
    });
  };

  const insertBlock = (prefix) => {
    if (wysiwygRef.current) {
      wysiwygRef.current.insertBlock(prefix);
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Expand selection to full lines
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    let lineEnd = content.indexOf("\n", end);
    if (lineEnd === -1) lineEnd = content.length;

    const linesContent = content.substring(lineStart, lineEnd);
    const lines = linesContent.split("\n");

    const isHeading = prefix.trim().startsWith("#");

    const newLines = lines.map((line) => {
      if (isHeading) {
        const cleanLine = line.replace(/^#{1,6}\s/, "");
        if (line.startsWith(prefix) && line.length > prefix.length) {
          return cleanLine;
        }
        return prefix + cleanLine;
      } else {
        if (line.startsWith(prefix)) {
          return line.substring(prefix.length);
        }
        return prefix + line;
      }
    });

    const newBlock = newLines.join("\n");
    const newText =
      content.substring(0, lineStart) + newBlock + content.substring(lineEnd);

    updateContentWithHistory(newText);

    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          lineStart + newBlock.length,
          lineStart + newBlock.length
        );
      }
    });
  };

  const handlePaste = (e) => {
    const clipboardData = e.clipboardData;
    if (!clipboardData) return;

    // If there's HTML content, try to convert it to Markdown
    if (clipboardData.types.includes("text/html")) {
      e.preventDefault();
      const html = clipboardData.getData("text/html");

      // Basic HTML to Markdown converter for common Rich Text / ChatGPT output
      const div = document.createElement("div");
      div.innerHTML = html;

      // Recursive function to walk DOM and build Markdown
      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || "";
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const el = node;
        let inner = "";
        el.childNodes.forEach((child) => (inner += walk(child)));

        switch (el.tagName.toLowerCase()) {
          case "h1":
            return `\n# ${inner}\n`;
          case "h2":
            return `\n## ${inner}\n`;
          case "h3":
            return `\n### ${inner}\n`;
          case "strong":
          case "b":
            return `**${inner}**`;
          case "em":
          case "i":
            return `*${inner}*`;
          case "u":
            return `<u>${inner}</u>`;
          case "s":
          case "strike":
            return `~~${inner}~~`;
          case "p":
            return `\n${inner}\n`;
          case "br":
            return "\n";
          case "ul":
            return `\n${inner}\n`;
          case "ol":
            return `\n${inner}\n`;
          case "li":
            return `- ${inner}\n`;
          case "code":
            return `\`${inner}\``;
          case "pre":
            return `\n\`\`\`\n${el.textContent}\n\`\`\`\n`;
          case "blockquote":
            return `\n> ${inner}\n`;
          case "div":
            return `\n${inner}\n`;
          case "span":
            return inner; // Often used for styling, just return content
          default:
            return inner;
        }
      };

      const markdown = walk(div)
        .trim()
        .replace(/\n{3,}/g, "\n\n");

      // Insert the converted markdown
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newText =
          content.substring(0, start) + markdown + content.substring(end);
        updateContentWithHistory(newText);

        requestAnimationFrame(() => {
          textarea.focus();
          textarea.setSelectionRange(
            start + markdown.length,
            start + markdown.length
          );
        });
      }
    }
    // Fallback: Let default paste happen (plain text)
  };

  const handleAiAction = async (action) => {
    setAiMenuOpen(false);
    setIsAiLoading(true);
    try {
      const result = await generateNoteEnhancement(action, content);
      if (action === "continue" || action === "make_todo") {
        updateContentWithHistory(content + "\n\n" + result);
      } else if (action === "auto_tag") {
        const newTags = result.split(",").map((t) => t.trim().toLowerCase());
        const mergedTags = [...new Set([...note.tags, ...newTags])];
        onUpdate(note.id, { tags: mergedTags });
        alert(`Added tags: ${newTags.join(", ")}`);
      } else {
        if (action === "fix_grammar" || action === "improve") {
          updateContentWithHistory(result);
        } else if (action === "summarize") {
          updateContentWithHistory(
            `**Summary:**\n${result}\n\n---\n\n${content}`
          );
        }
      }
    } catch (error) {
      alert("Failed to generate AI content.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Global Shortcuts that should work even in text area
    if (e.metaKey || e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          insertText("**", "**");
          break;
        case "i":
          e.preventDefault();
          insertText("*", "*");
          break;
        case "u":
          e.preventDefault();
          insertText("<u>", "</u>");
          break;
        case "k":
          e.preventDefault();
          e.stopPropagation();
          insertText("[", "](url)");
          break;
        case "z":
          e.preventDefault();
          if (e.shiftKey) redo();
          else undo();
          break;
        case "y":
          e.preventDefault();
          redo();
          break;
        case "`":
          e.preventDefault();
          insertText("`", "`");
          break;
      }

      if (e.altKey) {
        switch (e.key) {
          case "1":
            e.preventDefault();
            insertBlock("# ");
            break;
          case "2":
            e.preventDefault();
            insertBlock("## ");
            break;
          case "3":
            e.preventDefault();
            insertBlock("### ");
            break;
        }
      }

      if (e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case "x":
            e.preventDefault();
            insertText("~~", "~~");
            break;
          case "l":
            e.preventDefault();
            insertBlock("- ");
            break;
          case "o":
            e.preventDefault();
            insertBlock("1. ");
            break;
        }
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      insertText("    ", "");
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result;
          updateContentWithHistory(content + `\n![${file.name}](${base64})\n`);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const parseInline = (text) => {
    if (!text) return [];
    const parts = text.split(
      /(\*\*\*.*?\*\*\*|\*\*.*?\*\*|\*.*?\*|`.*?`|\[\[.*?\]\]|~~.*?~~|<u>.*?<\/u>)/g
    );
    return parts.map((part, i) => {
      if (part.startsWith("***") && part.endsWith("***") && part.length >= 6) {
        return (
          <strong key={i} className="font-bold text-gray-900">
            <em className="text-gray-800">{parseInline(part.slice(3, -3))}</em>
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
      if (part.startsWith("<u>") && part.endsWith("</u>") && part.length >= 7) {
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
          (n) => n.title.toLowerCase() === linkTarget.toLowerCase()
        );
        return (
          <span
            key={i}
            onClick={() =>
              targetNote
                ? onSelectNote(targetNote.id)
                : alert(`Note "${linkTarget}" not found.`)
            }
            className="text-indigo-600 font-medium hover:underline decoration-indigo-300 cursor-pointer bg-indigo-50 px-1 rounded hover:bg-indigo-100"
          >
            {linkTarget}
          </span>
        );
      }
      return part;
    });
  };

  const DrawingModal = () => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = 800;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#000000";
      }
    }, []);

    const getPos = (e, canvas) => {
      const rect = canvas.getBoundingClientRect();
      let clientX, clientY;
      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
      };
    };

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const start = (e) => {
        setIsDrawing(true);
        const { x, y } = getPos(e, canvas);
        ctx.beginPath();
        ctx.moveTo(x, y);
        e.preventDefault();
      };

      const move = (e) => {
        if (!isDrawing) return;
        const { x, y } = getPos(e, canvas);
        ctx.lineTo(x, y);
        ctx.stroke();
        e.preventDefault();
      };

      const stop = () => {
        setIsDrawing(false);
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
    }, [isDrawing]);

    const saveDrawing = () => {
      const data = canvasRef.current?.toDataURL("image/png");
      if (data) {
        updateContentWithHistory(content + `\n![Sketch](${data})\n`);
        setShowDrawingModal(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-4 rounded-xl shadow-2xl max-w-full"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Draw</h3>
            <button
              onClick={() => setShowDrawingModal(false)}
              className="text-gray-500 hover:text-gray-800"
            >
              ✕
            </button>
          </div>
          <div className="border border-gray-200 rounded shadow-inner cursor-crosshair overflow-hidden touch-none">
            <canvas
              ref={canvasRef}
              className="w-[300px] h-[300px] md:w-[800px] md:h-[600px] bg-white"
            />
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={saveDrawing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm font-medium transition-colors"
            >
              Insert Drawing
            </button>
          </div>
        </motion.div>
      </div>
    );
  };

  const MarkdownPreview = ({ text }) => {
    const lines = text.split("\n");
    return (
      <div className="prose prose-lg prose-indigo max-w-none text-gray-800 pb-20">
        {lines.map((line, idx) => {
          const imgMatch = line.match(/!\[(.*?)\]\((.*?)\)/);
          if (imgMatch) {
            return (
              <div key={idx} className="flex justify-center my-6">
                <img
                  src={imgMatch[2]}
                  alt={imgMatch[1]}
                  className="max-w-full rounded-xl shadow-md border border-gray-100"
                />
              </div>
            );
          }
          if (line.startsWith("# "))
            return (
              <h1
                key={idx}
                className="text-4xl font-bold mb-2 mt-4 text-gray-900 leading-tight"
              >
                {parseInline(line.substring(2))}
              </h1>
            );
          if (line.startsWith("## "))
            return (
              <h2
                key={idx}
                className="text-2xl font-bold mb-2 mt-3 text-gray-800 leading-snug"
              >
                {parseInline(line.substring(3))}
              </h2>
            );
          if (line.startsWith("### "))
            return (
              <h3
                key={idx}
                className="text-xl font-semibold mb-1 mt-2 text-gray-800"
              >
                {parseInline(line.substring(4))}
              </h3>
            );

          if (line.trim().startsWith("- [ ] "))
            return (
              <div key={idx} className="flex items-start space-x-3 my-2">
                <div className="shrink-0 mt-1.5 w-4 h-4 rounded border border-gray-300 bg-white" />
                <span className="text-gray-700">
                  {parseInline(line.replace("- [ ] ", ""))}
                </span>
              </div>
            );
          if (line.trim().startsWith("- [x] "))
            return (
              <div
                key={idx}
                className="flex items-start space-x-3 my-2 opacity-60"
              >
                <div className="shrink-0 mt-1.5 w-4 h-4 rounded border border-indigo-400 bg-indigo-500 flex items-center justify-center">
                  <CheckSquare className="w-3 h-3 text-white" />
                </div>
                <span className="text-gray-500 line-through">
                  {parseInline(line.replace("- [x] ", ""))}
                </span>
              </div>
            );
          if (line.trim().startsWith("- "))
            return (
              <li
                key={idx}
                className="ml-4 list-disc marker:text-gray-400 pl-2 my-1 text-gray-700"
              >
                {parseInline(line.substring(2))}
              </li>
            );
          if (line.trim().match(/^\d+\. /))
            return (
              <li
                key={idx}
                className="ml-4 list-decimal marker:text-gray-400 pl-2 my-1 text-gray-700"
              >
                {parseInline(line.replace(/^\d+\. /, ""))}
              </li>
            );
          if (line.startsWith("> "))
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-indigo-300 pl-4 py-1 my-2 text-gray-600 bg-gray-50/50 italic rounded-r"
              >
                {parseInline(line.substring(2))}
              </blockquote>
            );
          if (line.trim().startsWith("```"))
            return (
              <div
                key={idx}
                className="bg-gray-800 text-gray-200 p-4 rounded-lg my-4 font-mono text-sm overflow-x-auto shadow-inner border border-gray-700"
              >
                Code block
              </div>
            );
          if (line.trim() === "") return <div key={idx} className="h-6" />;
          return (
            <p key={idx} className="mb-3 leading-8 text-gray-800">
              {parseInline(line)}
            </p>
          );
        })}
      </div>
    );
  };

  const ToolbarBtn = ({ onClick, icon: Icon, active = false, title }) => (
    <button
      onClick={onClick}
      className={`p-2 rounded-lg transition-all active:scale-95 shrink-0 ${
        active
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
      }`}
      title={title}
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  return (
    <div
      className="flex-1 flex flex-col h-full bg-white relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {showDrawingModal && <DrawingModal />}

      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 bg-white/95 backdrop-blur z-20 sticky top-0">
        <div className="flex items-center space-x-3 overflow-hidden">
          {/* Collapse Restoration Buttons */}
          <div className="flex items-center space-x-1 mr-2">
            {!isNoteListOpen && (
              <button
                onClick={onToggleNoteList}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Open Note List"
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
              <Clock className="w-3 h-3" /> {format(note.updatedAt, "MMM d, p")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          {/* View mode buttons hidden - always show WYSIWYG editor */}

          <div className="h-6 w-px bg-gray-200 hidden md:block" />

          <div className="flex items-center space-x-1">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 disabled:opacity-30 transition-colors"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={() => onUpdate(note.id, { isPinned: !note.isPinned })}
            className={`p-2 rounded-full hover:bg-gray-100 transition-colors ${
              note.isPinned
                ? "text-indigo-600 bg-indigo-50"
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-2 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Toolbar - Always visible */}
      <div className="flex items-center space-x-1 px-4 md:px-6 py-2 border-b border-gray-100 bg-gray-50/80 backdrop-blur overflow-x-auto scrollbar-hide z-10 sticky top-[61px] w-full">
        <ToolbarBtn
          onClick={() => insertText("**", "**")}
          icon={Bold}
          title="Bold (Cmd+B)"
        />
        <ToolbarBtn
          onClick={() => insertText("*", "*")}
          icon={Italic}
          title="Italic (Cmd+I)"
        />
        <ToolbarBtn
          onClick={() => insertText("<u>", "</u>")}
          icon={Underline}
          title="Underline (Cmd+U)"
        />
        <ToolbarBtn
          onClick={() => insertText("~~", "~~")}
          icon={Strikethrough}
          title="Strikethrough (Cmd+Shift+X)"
        />
        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
        <ToolbarBtn
          onClick={() => insertBlock("# ")}
          icon={Heading}
          title="Heading 1 (Cmd+Alt+1)"
        />
        <ToolbarBtn
          onClick={() => insertBlock("> ")}
          icon={Quote}
          title="Quote"
        />
        <ToolbarBtn
          onClick={() => insertText("`", "`")}
          icon={Code}
          title="Inline Code (Cmd+`)"
        />
        <ToolbarBtn
          onClick={() => insertText("[", "](url)")}
          icon={LinkIcon}
          title="Link (Cmd+K)"
        />
        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
        <ToolbarBtn
          onClick={() => insertBlock("- [ ] ")}
          icon={CheckSquare}
          title="Checkbox"
        />
        <ToolbarBtn
          onClick={() => insertBlock("- ")}
          icon={List}
          title="Bullet List (Cmd+Shift+L)"
        />
        <div className="w-px h-5 bg-gray-300 mx-1 shrink-0" />
        <ToolbarBtn
          onClick={() => setShowDrawingModal(true)}
          icon={PenTool}
          title="Draw"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Single Editable Pane */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="max-w-6xl w-full px-6 py-8 md:px-12 flex-1 flex flex-col">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Untitled Note"
              className="w-full text-3xl md:text-4xl font-bold text-gray-900 placeholder-gray-300 border-none focus:outline-none focus:ring-0 bg-transparent mb-6 tracking-tight"
            />
            <WYSIWYGEditor
              ref={wysiwygRef}
              value={content}
              onChange={(newContent) => updateContentWithHistory(newContent)}
              onKeyDown={handleKeyDown}
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
              >
                <Sparkles className="w-4 h-4" /> Improve Writing
              </button>
              <button
                onClick={() => handleAiAction("fix_grammar")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
              >
                <CheckSquare className="w-4 h-4" /> Fix Grammar
              </button>
              <button
                onClick={() => handleAiAction("make_todo")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
              >
                <List className="w-4 h-4" /> Generate To-Do List
              </button>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => handleAiAction("summarize")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
              >
                <Columns className="w-4 h-4" /> Summarize
              </button>
              <button
                onClick={() => handleAiAction("continue")}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl flex items-center gap-3 transition-colors"
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
        >
          <Sparkles className="w-6 h-6 text-yellow-300 fill-current" />
        </button>
      </div>
    </div>
  );
};

export default Editor;
