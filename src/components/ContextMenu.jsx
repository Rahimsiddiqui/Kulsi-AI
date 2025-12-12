import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Copy,
  Scissors,
  Clipboard,
  Trash2,
  Share2,
  Search,
  Lightbulb,
  Sparkles,
  Pin,
  Link as LinkIcon,
  Mail,
  Download,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-toastify";

const ContextMenu = ({
  isVisible,
  position,
  onAddNote,
  onCopySelection,
  onCreateLink,
  onGenerateIdeas,
  onShareNote,
  onDownloadNote,
  onPinNote,
  onDeleteNote,
  onSearch,
  onEmailNote,
  selectedNote = null,
}) => {
  const [submenuOpen, setSubmenuOpen] = useState(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [contextType, setContextType] = useState("general"); // general, text, note

  useEffect(() => {
    if (!isVisible) return;

    // Adjust position to keep menu within viewport with better calculation
    let x = Math.max(10, position.x || 0);
    let y = Math.max(10, position.y || 0);

    const menuWidth = 280;
    const menuHeight = 400;
    const padding = 10;

    // Prevent menu from going off-screen right
    if (x + menuWidth + padding > window.innerWidth) {
      x = Math.max(10, window.innerWidth - menuWidth - padding);
    }

    // Prevent menu from going off-screen bottom
    if (y + menuHeight + padding > window.innerHeight) {
      y = Math.max(10, window.innerHeight - menuHeight - padding);
    }

    setAdjustedPosition({ x, y });

    // Detect context type based on selection
    try {
      const selectedText = window.getSelection()?.toString() || "";
      if (selectedText && selectedText.length > 0) {
        setContextType("text");
      } else if (selectedNote?.id) {
        setContextType("note");
      } else {
        setContextType("general");
      }
    } catch (error) {
      console.warn("Error detecting context:", error);
      setContextType("general");
    }
  }, [isVisible, position, selectedNote?.id]);

  if (!isVisible) return null;

  // AI Enhancement handlers
  const handleSummarize = async () => {
    if (!selectedNote?.content) {
      toast.info("Please select a note with content to summarize");
      return;
    }
    toast.info("Summarizing your note...");
    try {
      // TODO: Integrate with Gemini API for summarization
      const summary = `Summary of "${
        selectedNote.title
      }": ${selectedNote.content.substring(0, 100)}...`;
      toast.success("Summary created!");
    } catch (error) {
      toast.error("Failed to summarize");
    }
  };

  const handleExpandContent = async () => {
    if (!selectedNote?.content) {
      toast.info("Please select a note with content to expand");
      return;
    }
    toast.info("Expanding your content...");
    try {
      // TODO: Integrate with Gemini API for expansion
      toast.success("Content expanded!");
    } catch (error) {
      toast.error("Failed to expand content");
    }
  };

  const handleGrammarCheck = async () => {
    if (!selectedNote?.content) {
      toast.info("Please select a note with content to check");
      return;
    }
    toast.info("Checking grammar...");
    try {
      // TODO: Integrate with Gemini API for grammar check
      toast.success("Grammar check complete!");
    } catch (error) {
      toast.error("Failed to check grammar");
    }
  };

  const handleToneAdjust = async () => {
    if (!selectedNote?.content) {
      toast.info("Please select a note with content");
      return;
    }
    toast.info("Adjusting tone...");
    try {
      // TODO: Integrate with Gemini API for tone adjustment
      toast.success("Tone adjusted!");
    } catch (error) {
      toast.error("Failed to adjust tone");
    }
  };

  // Build dynamic menu based on context
  const getMenuItems = () => {
    const items = [];

    // Always available
    items.push({
      label: "Add Note",
      icon: FileText,
      action: onAddNote,
      show: true,
    });

    // Text selection context
    if (contextType === "text") {
      items.push(
        {
          label: "Copy Selection",
          icon: Copy,
          action: onCopySelection,
          show: true,
        },
        {
          label: "Cut",
          icon: Scissors,
          action: () => document.execCommand("cut"),
          show: true,
        },
        {
          label: "Create Link",
          icon: LinkIcon,
          action: onCreateLink,
          show: true,
        }
      );
    }

    // Paste always available
    items.push({
      label: "Paste",
      icon: Clipboard,
      action: () => {
        document.execCommand("paste");
        toast.success("Pasted!");
      },
      show: true,
    });

    // Note-specific actions
    if (contextType === "note" && selectedNote) {
      items.push(
        {
          label: "Generate Ideas",
          icon: Lightbulb,
          action: onGenerateIdeas,
          show: true,
        },
        {
          label: "AI Enhancements",
          icon: Sparkles,
          submenu: [
            {
              label: "Summarize",
              action: handleSummarize,
            },
            {
              label: "Expand Content",
              action: handleExpandContent,
            },
            {
              label: "Grammar Check",
              action: handleGrammarCheck,
            },
            {
              label: "Tone Adjustment",
              action: handleToneAdjust,
            },
          ],
          show: true,
        },
        {
          label: "Pin Note",
          icon: Pin,
          action: onPinNote,
          show: true,
        },
        {
          label: "Share",
          icon: Share2,
          action: onShareNote,
          show: true,
        },
        {
          label: "Email",
          icon: Mail,
          action: onEmailNote,
          show: true,
        },
        {
          label: "Download",
          icon: Download,
          action: onDownloadNote,
          show: true,
        },
        {
          label: "Delete",
          icon: Trash2,
          action: onDeleteNote,
          show: true,
        }
      );
    }

    // Always available
    items.push({
      label: "Search",
      icon: Search,
      action: onSearch,
      show: true,
    });

    return items.filter((item) => item.show !== false);
  };

  const menuItems = getMenuItems();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed z-9999 pointer-events-none"
          style={{
            left: `${adjustedPosition.x}px`,
            top: `${adjustedPosition.y}px`,
          }}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          <motion.div
            className="pointer-events-auto bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden backdrop-blur-lg bg-opacity-98 min-w-64"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                Quick Actions
              </p>
            </div>

            {/* Menu Items */}
            <div className="max-h-96 overflow-y-auto">
              {menuItems.map((item, index) => (
                <motion.div
                  key={`${contextType}-${index}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.1, delay: index * 0.02 }}
                >
                  {item.submenu ? (
                    <div
                      className="relative"
                      onMouseEnter={() => setSubmenuOpen(index)}
                      onMouseLeave={() => setSubmenuOpen(null)}
                    >
                      <button className="point w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 transition-all text-left text-sm font-medium hover:translate-x-0.5 hover:bg-gray-50 relative group">
                        <item.icon className="w-4 h-4 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                      </button>

                      {/* Submenu */}
                      {submenuOpen === index && (
                        <div className="absolute left-full top-0 ml-1 bg-white rounded-lg shadow-xl border border-gray-200 min-w-48 py-1">
                          {item.submenu.map((subitem, subindex) => (
                            <button
                              key={subindex}
                              onClick={() => {
                                subitem.action();
                                setSubmenuOpen(null);
                              }}
                              className="point w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 font-medium transition-all hover:translate-x-0.5"
                            >
                              {subitem.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        item.action();
                        setSubmenuOpen(null);
                      }}
                      className="point w-full px-4 py-2.5 flex items-center gap-3 text-gray-700 transition-all text-left text-sm font-medium hover:translate-x-0.5 hover:bg-gray-50"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500">
              <p className="text-center">Right-click to open menu</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ContextMenu;
