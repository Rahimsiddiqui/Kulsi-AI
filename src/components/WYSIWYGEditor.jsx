import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import { marked } from "marked";
import TurndownService from "turndown";

/**
 * WYSIWYG Editor Component
 * Uses contenteditable for true rich-text editing
 * Stores content as markdown internally but displays as formatted HTML
 * Uses marked for markdown→HTML and turndown for HTML→markdown conversion
 */

// Configure marked for safe HTML rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

// Create turndown service for HTML to markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const WYSIWYGEditor = forwardRef(
  ({ value, onChange, onKeyDown, placeholder = "Start typing..." }, ref) => {
    const editorRef = useRef(null);
    const [isComposing, setIsComposing] = useState(false);

    // Expose methods to parent via forwardRef
    useImperativeHandle(ref, () => ({
      insertText: (before, after = before) => {
        insertMarkdownWithSelection(before, after);
      },
      insertBlock: (prefix) => {
        insertBlockMarkdown(prefix);
      },
      focus: () => {
        editorRef.current?.focus();
      },
    }));

    // Convert markdown to HTML for display using marked
    const markdownToHtml = (markdown) => {
      if (!markdown) return "";
      try {
        return marked(markdown);
      } catch (error) {
        console.error("Error converting markdown to HTML:", error);
        return markdown;
      }
    };

    // Convert HTML to markdown for storage using turndown
    const htmlToMarkdown = (html) => {
      if (!html) return "";
      try {
        let markdown = turndownService.turndown(html);
        // Clean up extra whitespace
        markdown = markdown.replace(/\n\n\n+/g, "\n\n").trim();
        return markdown;
      } catch (error) {
        console.error("Error converting HTML to markdown:", error);
        return html;
      }
    };

    // Sync external changes to editor
    useEffect(() => {
      if (editorRef.current && value) {
        const displayHtml = markdownToHtml(value);
        if (displayHtml !== editorRef.current.innerHTML) {
          editorRef.current.innerHTML = displayHtml;
        }
      }
    }, [value]);

    const handleInput = () => {
      if (!isComposing && editorRef.current) {
        const html = editorRef.current.innerHTML;
        const markdown = htmlToMarkdown(html);
        onChange(markdown);
      }
    };

    // Insert text with markers around selection (for inline formatting)
    const insertMarkdownWithSelection = (before, after = "") => {
      const editor = editorRef.current;
      if (!editor) return;

      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      // Get the markdown content
      const markdown = htmlToMarkdown(editor.innerHTML);
      const selectedText = sel.toString();

      // Calculate position in markdown by walking DOM
      let charCountBefore = 0;
      let charCountAfter = 0;
      let foundStart = false;
      let foundEnd = false;

      const walk = (node) => {
        if (
          !foundStart &&
          sel.containsNode(node, true) &&
          node === sel.anchorNode
        ) {
          charCountBefore += sel.anchorOffset;
          foundStart = true;
          return;
        }
        if (
          !foundEnd &&
          sel.containsNode(node, true) &&
          node === sel.focusNode
        ) {
          if (!foundStart) {
            charCountBefore = charCountAfter + sel.focusOffset;
            charCountAfter = charCountBefore;
          } else {
            charCountAfter = charCountBefore + sel.focusOffset;
          }
          foundEnd = true;
          return;
        }

        if (!foundStart && !foundEnd) {
          if (node.nodeType === Node.TEXT_NODE) {
            charCountBefore += node.textContent?.length || 0;
            charCountAfter = charCountBefore;
          } else {
            for (const child of node.childNodes || []) {
              walk(child);
            }
          }
        }
      };

      walk(editor);

      // Ensure proper start/end positions
      const start = Math.min(charCountBefore, charCountAfter);
      const end = Math.max(charCountBefore, charCountAfter);

      let newMarkdown = "";

      if (selectedText.trim() === "") {
        // No selection: insert markers at cursor position
        newMarkdown =
          markdown.substring(0, start) +
          before +
          after +
          markdown.substring(start);
      } else {
        // With selection: wrap it
        newMarkdown =
          markdown.substring(0, start) +
          before +
          selectedText +
          after +
          markdown.substring(end);
      }

      onChange(newMarkdown);
      editor.innerHTML = markdownToHtml(newMarkdown);

      // Restore focus to editor
      setTimeout(() => {
        editor.focus();
      }, 0);
    };

    // Insert block-level markdown (for headings, lists, etc.)
    const insertBlockMarkdown = (prefix) => {
      const editor = editorRef.current;
      if (!editor) return;

      const markdown = htmlToMarkdown(editor.innerHTML);
      const lines = markdown.split("\n");

      // Get current cursor position from selection
      const sel = window.getSelection();
      if (!sel.rangeCount) return;

      // Find the line containing the cursor by walking from anchorNode
      let currentLineIndex = 0;
      let charCountToNode = 0;

      // Count all text content before anchor node
      const walkToAnchor = (node) => {
        if (node === sel.anchorNode) {
          charCountToNode += sel.anchorOffset;
          return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          charCountToNode += node.textContent?.length || 0;
        } else {
          for (const child of node.childNodes || []) {
            if (walkToAnchor(child)) return true;
          }
        }
        return false;
      };

      walkToAnchor(editor);

      // Convert char count to line index
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1; // +1 for newline
        if (charCount >= charCountToNode) {
          currentLineIndex = i;
          break;
        }
      }

      const isHeading = prefix.trim().startsWith("#");
      const isList = prefix.trim() === "-" || /^\d+\.$/.test(prefix.trim());

      const newLines = lines.map((line, index) => {
        if (index !== currentLineIndex) return line;

        const trimmedLine = line.trim();

        // Toggle or apply formatting
        if (isHeading) {
          // Remove any existing heading markers
          const cleanLine = trimmedLine.replace(/^#{1,6}\s+/, "");
          // Check if already has this exact heading level
          if (trimmedLine.startsWith(prefix)) {
            return cleanLine;
          }
          return prefix + cleanLine;
        } else if (isList) {
          // Check if already has list marker
          if (trimmedLine.startsWith("- ") || /^\d+\.\s+/.test(trimmedLine)) {
            // Remove existing list marker and apply new one
            const cleanLine = trimmedLine.replace(/^(-|\d+\.)\s+/, "");
            return prefix + cleanLine;
          }
          return prefix + trimmedLine;
        } else {
          if (trimmedLine.startsWith(prefix)) {
            return trimmedLine.substring(prefix.length);
          }
          return prefix + trimmedLine;
        }
      });

      const newMarkdown = newLines.join("\n");
      onChange(newMarkdown);
      editor.innerHTML = markdownToHtml(newMarkdown);
      editor.focus();
    };

    const handleKeyDown = (e) => {
      // Call parent's onKeyDown if provided
      if (onKeyDown) {
        onKeyDown(e);
      }

      // Tab for indentation (top-level)
      if (e.key === "Tab") {
        e.preventDefault();
        insertMarkdownWithSelection("    ", "");
        return;
      }

      // Alt + Number for headings (standalone Alt)
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        const numKey = e.key;
        const headingLevels = {
          1: "# ",
          2: "## ",
          3: "### ",
          4: "#### ",
          5: "##### ",
          6: "###### ",
        };

        if (headingLevels[numKey]) {
          e.preventDefault();
          insertBlockMarkdown(headingLevels[numKey]);
          return;
        }
      }

      // Ctrl/Cmd + Key shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (
          e.key.toLowerCase() === "z" ||
          e.key.toLowerCase() === "y" ||
          e.key.toLowerCase() === "a" ||
          e.key.toLowerCase() === "c" ||
          e.key.toLowerCase() === "v" ||
          e.key.toLowerCase() === "x"
        ) {
          return;
        }

        // Ctrl/Cmd + Shift for lists and strikethrough
        if (e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case "x":
              e.preventDefault();
              insertMarkdownWithSelection("~~", "~~");
              return;
            case "l":
              e.preventDefault();
              insertBlockMarkdown("- ");
              return;
            case "o":
              e.preventDefault();
              insertBlockMarkdown("1. ");
              return;
            default:
              break;
          }
        }

        // Ctrl/Cmd + Key (without shift)
        switch (e.key.toLowerCase()) {
          case "b":
            e.preventDefault();
            insertMarkdownWithSelection("**", "**");
            return;
          case "i":
            e.preventDefault();
            insertMarkdownWithSelection("*", "*");
            return;
          case "u":
            e.preventDefault();
            insertMarkdownWithSelection("__", "__");
            return;
          case "k":
            e.preventDefault();
            insertMarkdownWithSelection("[", "](url)");
            return;
          case "`":
            e.preventDefault();
            insertMarkdownWithSelection("`", "`");
            return;
          default:
            break;
        }
      }
    };

    return (
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => {
          setIsComposing(false);
          handleInput();
        }}
        data-placeholder={placeholder}
        className="flex-1 overflow-y-auto focus:outline-none text-base md:text-lg leading-relaxed text-gray-900 empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none"
        style={{
          minHeight: "300px",
          wordWrap: "break-word",
          whiteSpace: "pre-wrap",
          outlineColor: "transparent",
        }}
      />
    );
  }
);

WYSIWYGEditor.displayName = "WYSIWYGEditor";

export default WYSIWYGEditor;
