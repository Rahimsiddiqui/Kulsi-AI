import React, {
  useImperativeHandle,
  forwardRef,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Strike from "@tiptap/extension-strike";

const TipTapEditor = forwardRef(
  (
    {
      value = "",
      onChange = () => {},
      onKeyDown = () => {},
      onPaste = () => {},
      placeholder = "Start writing...",
    },
    ref
  ) => {
    // Track if the change is coming from the editor itself (to prevent sync loops)
    const isInternalChangeRef = useRef(false);
    const lastMarkdownRef = useRef("");

    // Convert HTML to Markdown
    const htmlToMarkdown = (html) => {
      if (!html) return "";

      const div = document.createElement("div");
      div.innerHTML = html;

      const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
        if (node.nodeType !== Node.ELEMENT_NODE) return "";

        const el = node;
        let inner = "";
        Array.from(el.childNodes).forEach((child) => {
          inner += walk(child);
        });

        switch (el.tagName.toLowerCase()) {
          case "h1":
            return `# ${inner.trim()}\n\n`;
          case "h2":
            return `## ${inner.trim()}\n\n`;
          case "h3":
            return `### ${inner.trim()}\n\n`;
          case "h4":
            return `#### ${inner.trim()}\n\n`;
          case "h5":
            return `##### ${inner.trim()}\n\n`;
          case "h6":
            return `###### ${inner.trim()}\n\n`;
          case "strong":
          case "b":
            return `**${inner}**`;
          case "em":
          case "i":
            return `*${inner}*`;
          case "u":
            return `__${inner}__`;
          case "s":
          case "del":
          case "strike":
            return `~~${inner}~~`;
          case "p":
            return `${inner}\n\n`;
          case "br":
            return "\n";
          case "ul":
          case "ol":
            // Check if this is a task list (contains task items)
            const isTaskList = el.querySelector("li[data-type='taskItem']");
            if (isTaskList) {
              // For task lists, don't convert to markdown, just return the content
              // This prevents sync loops with checkboxes
              return `${inner}\n`;
            }
            return `${inner}\n`;
          case "li":
            // Check if this li contains a checkbox (task item)
            const checkbox = el.querySelector("input[type='checkbox']");
            if (checkbox) {
              const isChecked =
                checkbox.hasAttribute("checked") || checkbox.checked;
              // Get text content without the checkbox
              const textContent = Array.from(el.childNodes)
                .map((node) => {
                  if (
                    node.nodeType === Node.ELEMENT_NODE &&
                    node.tagName === "INPUT"
                  ) {
                    return "";
                  }
                  return walk(node);
                })
                .join("")
                .trim();
              return isChecked
                ? `[x] ${textContent}\n`
                : `[ ] ${textContent}\n`;
            }
            const trimmedContent = inner.trim();
            // For list items, only output if they have content
            // Don't output bare hyphens as they're not valid list items
            return trimmedContent ? `- ${trimmedContent}\n` : "";
          case "input":
            // Don't output input elements - they're handled in the li case
            return "";
          case "code":
            return `\`${inner}\``;
          case "pre":
            return `\`\`\`\n${el.textContent}\n\`\`\`\n\n`;
          case "blockquote":
            return `> ${inner.trim()}\n\n`;
          case "a":
            const href = el.getAttribute("href");
            return `[${inner}](${href})`;
          case "img":
            const alt = el.getAttribute("alt") || "";
            const src = el.getAttribute("src") || "";
            return `![${alt}](${src})`;
          case "div":
          case "span":
            return inner;
          default:
            return inner;
        }
      };

      return walk(div).replace(/\n{3,}/g, "\n\n");
    };

    // Convert Markdown to HTML - proper handling of all elements
    const markdownToHtml = useCallback((markdown) => {
      if (!markdown) return "<p></p>";

      let html = markdown;

      // Code blocks (triple backticks)
      html = html.replace(/```(.*?)\n([\s\S]*?)\n```/g, (match, lang, code) => {
        return `<pre><code>${code}</code></pre>`;
      });

      // Headings
      html = html.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
        const level = hashes.length;
        return `<h${level}>${text}</h${level}>`;
      });

      // Ordered lists (1. 2. 3.)
      html = html.replace(/^\d+\.\s*(.*?)$/gm, (match, text) => {
        return `<li>${text}</li>`;
      });

      // Unchecked: [ ] text
      html = html.replace(/^\[\s*\]\s*(.*)$/gm, (match, text) => {
        const content = text.trim();
        return `<li data-type="taskItem" data-checked="false"><label><input type="checkbox">${
          content ? `<span>${content}</span>` : "<span></span>"
        }</label></li>`;
      });
      // Checked: [x] text
      html = html.replace(/^\[x\]\s*(.*)$/gim, (match, text) => {
        const content = text.trim();
        return `<li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked>${
          content ? `<span>${content}</span>` : "<span></span>"
        }</label></li>`;
      });

      // Wrap consecutive task items into a task-list <ul> with data-type="taskList"
      html = html.replace(
        /((?:<li data-type="taskItem"[^>]*>[\s\S]*?<\/li>\s*)+)/g,
        (match) => {
          const trimmed = match.trim();
          return `<ul data-type="taskList">${trimmed}</ul>`;
        }
      );

      // --- Regular unordered list items (- or *) — do this after task items so they aren't matched ---
      html = html.replace(
        /^[\-\*]\s+(?!\[[\s\]xX\]])(.*?)$/gm,
        (match, text) => {
          return `<li>${text}</li>`;
        }
      );

      // Wrap consecutive regular list items (but exclude any <li> that already has data-type)
      html = html.replace(
        /((?:<li(?![^>]*data-type)[^>]*>[\s\S]*?<\/li>\s*)+)/g,
        (match) => {
          return `<ul>${match.trim()}</ul>`;
        }
      );

      // Clean up empty list items and empty task items
      html = html.replace(
        /<li[^>]*>\s*<label>\s*<input[^>]*>\s*<span>\s*<\/span>\s*<\/label>\s*<\/li>/g,
        ""
      );
      html = html.replace(/<li[^>]*>\s*<\/li>/g, "");

      // Blockquotes
      html = html.replace(/^>\s+(.+)$/gm, (match, text) => {
        return `<blockquote>${text}</blockquote>`;
      });

      // Bold & Italic (order matters)
      html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
      html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/__(.*?)__/g, "<u>$1</u>");
      html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
      html = html.replace(/~~(.*?)~~/g, "<s>$1</s>");

      // Inline code
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

      // Links + Images
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
      html = html.replace(
        /!\[([^\]]*)\]\(([^)]+)\)/g,
        '<img src="$2" alt="$1" />'
      );

      // Paragraphs - split by double newlines, skip block elements
      const parts = html.split(/\n\n+/);
      html = parts
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed) return "";
          // Skip if already a block element
          if (/^</.test(trimmed)) {
            return trimmed;
          }
          return `<p>${trimmed}</p>`;
        })
        .join("");

      // Remove empty <ul> / <li> leftovers
      html = html.replace(/<li>[\s\-]*<\/li>/g, "");
      html = html.replace(/<ul>\s*<\/ul>/g, "");

      return html;
    }, []);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          strike: false,
          paragraph: {
            HTMLAttributes: {
              class: "leading-8 text-gray-800",
            },
          },
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
            HTMLAttributes: {
              class: "font-bold text-gray-900 mt-8 mb-7",
            },
          },
          h1: {
            HTMLAttributes: {
              class: "text-5xl font-bold text-gray-900 mt-8 mb-7",
            },
          },
          h2: {
            HTMLAttributes: {
              class: "text-4.5xl font-bold text-gray-900 mt-8 mb-7",
            },
          },
          h3: {
            HTMLAttributes: {
              class: "text-4xl font-bold text-gray-900 mt-8 mb-7",
            },
          },
          h4: {
            HTMLAttributes: {
              class: "text-3.5xl font-bold text-gray-900 mt-8 mb-7",
            },
          },
          h5: {
            HTMLAttributes: {
              class: "text-3xl font-bold text-gray-900 mt-8 mb-7",
            },
          },
          h6: {
            HTMLAttributes: {
              class: "text-2.5xl font-bold text-gray-900 mt-8 mb-7",
            },
          },
          bulletList: {
            HTMLAttributes: {
              class: "ml-4 list-disc marker:text-gray-400 my-2 space-y-1",
            },
          },
          orderedList: {
            HTMLAttributes: {
              class: "ml-4 list-decimal marker:text-gray-400 my-2 space-y-1",
            },
          },
          codeBlock: {
            HTMLAttributes: {
              class:
                "bg-gray-800 text-gray-200 p-4 rounded-lg my-4 font-mono text-sm overflow-x-auto shadow-inner border border-gray-700",
            },
          },
          blockquote: {
            HTMLAttributes: {
              class:
                "border-l-4 border-indigo-300 pl-4 py-1 my-2 text-gray-600 bg-gray-50/50 italic rounded-r",
            },
          },
          code: {
            HTMLAttributes: {
              class:
                "bg-gray-100 text-pink-600 rounded px-1.5 py-0.5 font-mono text-sm border border-gray-200",
            },
          },
        }),
        Strike.configure({
          HTMLAttributes: {
            class: "line-through",
          },
        }),
        TaskList.configure({
          HTMLAttributes: {
            "data-type": "taskList",
            class: "ml-2 space-y-2 list-none",
          },
        }),
        TaskItem.configure({
          HTMLAttributes: {
            "data-type": "taskItem",
            class: "flex items-center gap-2",
          },
          nested: true,
        }),
      ],
      content: markdownToHtml(value),
      onUpdate: ({ editor }) => {
        const currentHTML = editor.getHTML();

        // Check if the only changes are to task lists (checkbox state)
        // If so, don't sync to parent
        const hasTaskListChanges = currentHTML.includes('data-type="taskItem"');
        const lastHTMLHasTaskList =
          lastMarkdownRef.current &&
          markdownToHtml(lastMarkdownRef.current).includes(
            'data-type="taskItem"'
          );

        if (hasTaskListChanges && lastHTMLHasTaskList) {
          // Both have task lists, which means checkbox state might have changed
          // Don't sync to avoid loops
          return;
        }

        const newMarkdown = htmlToMarkdown(currentHTML);
        lastMarkdownRef.current = newMarkdown;
        isInternalChangeRef.current = true;
        onChange(newMarkdown);
      },
      onKeyDown: ({ event }) => {
        // Call the parent's onKeyDown handler
        onKeyDown(event);
        // Return false to allow TipTap to handle the event normally
        // unless the parent handler already prevented it
        return event.defaultPrevented;
      },
      onPaste: ({ event }) => {
        onPaste(event);
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-lg prose-indigo max-w-none outline-none text-gray-800 pb-20 min-h-96",
          "data-placeholder": placeholder,
        },
      },
    });

    // Update content when value prop changes (but not from internal editor changes)
    useEffect(() => {
      if (!editor) return;

      // Skip if this change came from the editor itself
      if (isInternalChangeRef.current) {
        isInternalChangeRef.current = false;
        lastMarkdownRef.current = value || "";
        return;
      }

      const html = markdownToHtml(value || "");
      lastMarkdownRef.current = value || "";
      editor.commands.setContent(html, false);
    }, [value, editor, markdownToHtml]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      insertText: (before, after) => {
        if (!editor) return;

        try {
          // Map markdown syntax to TipTap marks
          const markMap = {
            "**": "bold",
            "*": "italic",
            __: "underline",
            "~~": "strikethrough",
            "`": "code",
          };

          const markName = markMap[before];

          // If we have a valid mark, use TipTap's toggleMark command
          // This properly handles adding/removing marks without losing formatting
          if (markName) {
            editor.chain().focus().toggleMark(markName).run();
          } else {
            // For non-mark formatting (like links), use the original logic
            const { from, to } = editor.state.selection;
            const selectedText = editor.state.doc.textBetween(from, to);

            let newText;
            if (
              selectedText.startsWith(before) &&
              selectedText.endsWith(after) &&
              selectedText.length > before.length + after.length
            ) {
              // Remove the wrapping
              newText = selectedText.slice(before.length, -after.length);
            } else {
              // Add the wrapping
              newText = before + selectedText + after;
            }

            // If there's selected text, replace it
            if (selectedText.length > 0) {
              editor
                .chain()
                .focus()
                .deleteRange({ from, to })
                .insertContent(newText)
                .run();
            } else {
              // No selection - just insert at cursor
              editor.chain().focus().insertContent(newText).run();
            }
          }
        } catch (err) {
          console.error("insertText error:", err);
        }
      },
      insertBlock: (prefix) => {
        if (!editor) return;

        try {
          // Get current position
          const { from } = editor.state.selection;

          // Find the start of the current line
          const $pos = editor.state.doc.resolve(from);
          const lineStart = $pos.start();

          // Go to line start and insert prefix
          editor
            .chain()
            .focus()
            .setSelection(lineStart)
            .insertContent(prefix)
            .run();
        } catch (err) {
          console.error("insertBlock error:", err);
        }
      },
      setHeading: (level) => {
        if (!editor) return;

        try {
          // Use TipTap's setHeading command with proper chaining
          const isCurrentLevel = editor.isActive("heading", { level });

          if (isCurrentLevel) {
            // If already at this heading level, toggle back to paragraph
            editor.chain().focus().setParagraph().run();
          } else {
            // Set to the specified heading level
            editor.chain().focus().setHeading({ level }).run();
          }
        } catch (err) {
          console.error("setHeading error:", err);
        }
      },
      toggleBulletList: () => {
        if (!editor) return;

        try {
          editor.chain().focus().toggleBulletList().run();
        } catch (err) {
          console.error("toggleBulletList error:", err);
        }
      },
      toggleOrderedList: () => {
        if (!editor) return;

        try {
          editor.chain().focus().toggleOrderedList().run();
        } catch (err) {
          console.error("toggleOrderedList error:", err);
        }
      },
      toggleTaskList: () => {
        if (!editor) return;

        try {
          editor.chain().focus().toggleTaskList().run();
        } catch (err) {
          console.error("toggleTaskList error:", err);
        }
      },
      insertMarkdown: (markdown) => {
        if (!editor) return;
        const html = markdownToHtml(markdown);
        editor.chain().focus().insertContent(html).run();
      },
      focus: () => {
        if (!editor) return;
        editor.view.focus();
      },
      setContent: (markdown) => {
        if (!editor) return;
        const html = markdownToHtml(markdown);
        editor.commands.setContent(html);
      },
      getMarkdown: () => {
        if (!editor) return "";
        return htmlToMarkdown(editor.getHTML());
      },
      getHTML: () => {
        if (!editor) return "";
        return editor.getHTML();
      },
    }));

    return (
      <div className="relative w-full">
        <style>{`
          .ProseMirror::selection {
            background-color: rgba(99, 102, 241, 0.2);
          }
        `}</style>
        <EditorContent
          editor={editor}
          className="ProseMirror w-full"
          style={{
            whiteSpace: "pre-wrap",
            wordWrap: "break-word",
            userSelect: "text",
            WebkitUserSelect: "text",
          }}
          onMouseUp={(e) => {
            // Fix double-click selection to not include trailing space
            const selection = window.getSelection();
            if (selection.toString()) {
              const range = selection.getRangeAt(0);
              let endOffset = range.endOffset;
              const endNode = range.endContainer;

              // If the selection ends with a space, trim it
              const text = endNode.textContent || "";
              if (endOffset > 0 && text[endOffset - 1] === " ") {
                range.setEnd(endNode, endOffset - 1);
              }
            }
          }}
        />
      </div>
    );
  }
);

TipTapEditor.displayName = "TipTapEditor";

export default TipTapEditor;
