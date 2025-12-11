import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  Suspense,
} from "react";
import { Menu } from "lucide-react";
import CircularProgress from "@mui/material/CircularProgress";
import { ToastContainer, Zoom } from "react-toastify";

import Sidebar from "./components/Sidebar.jsx";
import NoteList from "./components/NoteList.jsx";
import Editor from "./components/Editor.jsx";
import CommandPalette from "./components/CommandPalette.jsx";
import SubscriptionModal from "./components/SubscriptionModal.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import AuthForm from "./components/AuthForm.jsx";
import VerifyEmail from "./components/VerifyEmail.jsx";
import { useNotes } from "./hooks/useNotes.js";
import { useAuth } from "./hooks/useAuth.jsx";
import { toast } from "react-toastify";
import { FolderType } from "../server/config/types.js";
import { INITIAL_FOLDERS } from "../server/config/constants.js";
import { generateFlashcards } from "./services/geminiService.js";
import { AnimatePresence, motion } from "framer-motion";

// Lazy load heavy views
const GraphView = React.lazy(() => import("./components/GraphView.jsx"));

const AppContent = () => {
  const {
    notes,
    addNote,
    updateNote,
    deleteNote,
    isLoading,
    syncError,
    setSyncError,
  } = useNotes();
  const [activeFolderId, setActiveFolderId] = useState(FolderType.ALL);
  const [selectedNoteId, setSelectedNoteId] = useState(null);

  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [isNoteListOpen, setIsNoteListOpen] = useState(true);

  const [currentView, setCurrentView] = useState("notes");
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [userPlan, setUserPlan] = useState("free"); // Persist this in real app

  // Flashcard State
  const [flashcards, setFlashcards] = useState([]);
  const [isGeneratingFlashcards, setIsGeneratingFlashcards] = useState(false);
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Responsive Sidebar Logic
  useEffect(() => {
    const handleResize = () => {
      const isDesktopNow = window.innerWidth > 768;
      if (isDesktopNow) {
        // Desktop defaults
        setSidebarOpen(true);
        setIsNoteListOpen(true);
      } else {
        // Mobile: close note list when on small screens
        setSidebarOpen(false);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Show sync errors as toasts
  useEffect(() => {
    if (syncError) {
      toast.error(syncError);
      setSyncError(null);
    }
  }, [syncError, setSyncError]);

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      if (activeFolderId === FolderType.ALL)
        return note.folderId !== FolderType.TRASH;
      if (activeFolderId === FolderType.TRASH)
        return note.folderId === FolderType.TRASH;
      if (activeFolderId === FolderType.FAVORITES)
        return note.isPinned && note.folderId !== FolderType.TRASH;
      return note.folderId === activeFolderId;
    });
  }, [notes, activeFolderId]);

  const activeFolder =
    INITIAL_FOLDERS.find((f) => f.id === activeFolderId) || INITIAL_FOLDERS[0];
  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  const handleCreateNote = useCallback(
    (title) => {
      // Check Plan Limits
      if (userPlan === "free" && notes.length >= 50) {
        setIsSubscriptionOpen(true);
        return;
      }
      const newId = addNote(activeFolderId, title);
      setSelectedNoteId(newId);
      setCurrentView("notes");
      if (window.innerWidth < 768) setSidebarOpen(false);
    },
    [addNote, activeFolderId, userPlan, notes.length]
  );

  const generateFlashcardsForView = async () => {
    if (!filteredNotes || filteredNotes.length === 0) {
      toast.error("No notes available to create flashcards");
      return;
    }
    setIsGeneratingFlashcards(true);
    try {
      const contextNote = filteredNotes[0];
      if (!contextNote?.content) {
        toast.error("Selected note has no content");
        return;
      }
      const cards = await generateFlashcards(contextNote.content);
      if (!Array.isArray(cards)) {
        toast.error("Invalid flashcard format received");
        return;
      }
      setFlashcards(cards);
      if (cards.length === 0) {
        toast.info("No flashcards could be generated from this note");
      } else {
        toast.success(`Generated ${cards.length} flashcards`);
      }
    } catch (error) {
      console.error("Flashcard generation error:", error);
      toast.error(error.message || "Failed to generate flashcards");
    } finally {
      setIsGeneratingFlashcards(false);
    }
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        if (!e.defaultPrevented) {
          e.preventDefault();
          setIsCommandPaletteOpen((prev) => !prev);
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        handleCreateNote();
      }
      // Toggle Sidebar (Cmd + \)
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        // e.preventDefault(); // handled in editor for split view
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCreateNote]);

  const isDesktop = window.innerWidth > 768;

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={2000}
        limit={2}
        hideProgressBar={true}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable={false}
        pauseOnHover
        theme="light"
        transition={Zoom}
        toastStyle={{
          width: "auto",
          color: "#000",
          padding: "0 40px 0 30px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
          fontWeight: "500",
        }}
      />
      <ErrorBoundary>
        <div className="flex h-screen w-screen bg-white text-gray-900 overflow-hidden font-sans">
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-4">
                <CircularProgress size={40} />
                <p className="text-sm text-gray-600">Loading your notes...</p>
              </div>
            </div>
          )}

          <CommandPalette
            isOpen={isCommandPaletteOpen}
            onClose={() => setIsCommandPaletteOpen(false)}
            notes={notes}
            onSelectNote={(id) => {
              setSelectedNoteId(id);
              setCurrentView("notes");
            }}
            onCreateNote={handleCreateNote}
          />

          <SubscriptionModal
            isOpen={isSubscriptionOpen}
            onClose={() => setIsSubscriptionOpen(false)}
            currentPlan={userPlan}
            onUpgrade={setUserPlan}
          />

          {/* Mobile Sidebar Overlay */}
          <AnimatePresence mode="wait">
            {sidebarOpen && !isDesktop && (
              <motion.div
                key="sidebar-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                onClick={() => setSidebarOpen(false)}
              />
            )}
          </AnimatePresence>

          {/* Sidebar Drawer */}
          <motion.div
            className={`fixed md:relative z-50 h-full shadow-2xl md:shadow-none shrink-0 bg-gray-50 border-r border-gray-200/60`}
            initial={false}
            animate={{
              x: isDesktop ? 0 : sidebarOpen ? 0 : "-100%",
              width: isDesktop ? (sidebarOpen ? 256 : 72) : 288, // 72px for mini sidebar
              opacity: 1,
            }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            style={{
              position: isDesktop ? "relative" : "fixed",
              left: 0,
              overflow: "hidden",
            }}
          >
            <Sidebar
              isOpen={sidebarOpen}
              activeFolder={activeFolderId}
              currentView={currentView}
              onSelectFolder={(id) => {
                setActiveFolderId(id);
                setSelectedNoteId(null);
                if (!isDesktop) setSidebarOpen(false);
              }}
              onSelectView={(view) => {
                setCurrentView(view);
                if (view !== "notes") setSelectedNoteId(null);
                if (!isDesktop) setSidebarOpen(false);
              }}
              onCreateNote={handleCreateNote}
              onOpenSettings={() => alert("Settings would open here")}
              onOpenSubscription={() => setIsSubscriptionOpen(true)}
              userPlan={userPlan}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              isMobile={!isDesktop}
            />
          </motion.div>

          {/* Main Content Area */}
          <div className="flex flex-1 flex-col md:flex-row h-full overflow-hidden relative bg-white">
            {/* Mobile Header */}
            {!isDesktop && (
              <div className="h-14 border-b border-gray-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur z-30 shrink-0">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2 -ml-2 text-gray-600"
                >
                  <Menu className="w-6 h-6" />
                </button>
                <span className="font-semibold text-gray-900">Kulsi AI</span>
                <div className="w-6" /> {/* Spacer */}
              </div>
            )}

            {/* Note List Column */}
            <AnimatePresence mode="wait">
              {currentView === "notes" && isNoteListOpen && (
                <motion.div
                  key="note-list"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: isDesktop ? 320 : "100%", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="h-full bg-white z-0 shrink-0 border-r border-gray-100 overflow-hidden"
                >
                  <NoteList
                    notes={filteredNotes}
                    selectedNoteId={selectedNoteId}
                    onSelectNote={(id) => {
                      setSelectedNoteId(id);
                    }}
                    folderName={activeFolder.name}
                    onToggle={() => setIsNoteListOpen(false)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Editor / Viewport */}
            <div
              className={`flex-1 h-full bg-white relative overflow-hidden ${
                !selectedNoteId && currentView === "notes" && !isDesktop
                  ? "hidden"
                  : "block"
              }`}
            >
              {currentView === "notes" ? (
                selectedNote ? (
                  <div className="h-full flex flex-col">
                    <Editor
                      note={selectedNote}
                      notes={notes}
                      onUpdate={updateNote}
                      onDelete={(id) => {
                        deleteNote(id);
                        setSelectedNoteId(null);
                      }}
                      onSelectNote={setSelectedNoteId}
                      isSidebarOpen={sidebarOpen}
                      isNoteListOpen={isNoteListOpen}
                      onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                      onToggleNoteList={() =>
                        setIsNoteListOpen(!isNoteListOpen)
                      }
                    />
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 bg-gray-50/30 p-8 text-center relative">
                    {/* Empty State Toggles */}
                    <div className="absolute top-4 left-4 flex space-x-2">
                      {!isNoteListOpen && (
                        <button
                          onClick={() => setIsNoteListOpen(true)}
                          className="p-2 bg-white shadow rounded-lg hover:bg-gray-50 text-gray-600"
                          title="Open List"
                        >
                          <Menu className="w-5 h-5 rotate-180" />
                        </button>
                      )}
                    </div>

                    <div className="w-24 h-24 bg-linear-to-br from-indigo-50 to-white rounded-3xl shadow-sm border border-indigo-50 flex items-center justify-center mb-4">
                      <span className="text-6xl">✨</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Welcome to Kulsi AI
                    </h3>
                    <p className="font-medium text-gray-400 max-w-sm">
                      Select a note from the list or press{" "}
                      <kbd className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 text-xs shadow-sm">
                        Cmd+K
                      </kbd>{" "}
                      <kbd className="font-mono bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 text-xs shadow-sm">
                        Ctrl+K
                      </kbd>{" "}
                      to open the command palette.
                    </p>
                  </div>
                )
              ) : currentView === "graph" ? (
                <div className="h-full relative">
                  <div className="absolute top-4 left-4 z-10">
                    {!sidebarOpen && !isDesktop && (
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 bg-white shadow rounded-lg hover:bg-gray-50"
                      >
                        <Menu className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center h-full">
                        Loading Graph...
                      </div>
                    }
                  >
                    <GraphView
                      notes={notes}
                      onSelectNote={(id) => {
                        setSelectedNoteId(id);
                        setCurrentView("notes");
                      }}
                    />
                  </Suspense>
                </div>
              ) : currentView === "flashcards" ? (
                <div className="h-full flex flex-col items-center justify-center bg-gray-100 p-8 overflow-y-auto relative">
                  <div className="absolute top-4 left-4 z-10">
                    {!sidebarOpen && !isDesktop && (
                      <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 bg-white shadow rounded-lg hover:bg-gray-50"
                      >
                        <Menu className="w-5 h-5 text-gray-600" />
                      </button>
                    )}
                  </div>
                  {flashcards.length === 0 ? (
                    <div className="text-center">
                      <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        AI Flashcards
                      </h2>
                      <p className="text-gray-600 mb-8 max-w-md">
                        Generate study flashcards from your current folder's
                        notes.
                      </p>
                      <button
                        onClick={generateFlashcardsForView}
                        disabled={isGeneratingFlashcards}
                        className="bg-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 mx-auto transition-transform active:scale-95"
                      >
                        {isGeneratingFlashcards
                          ? "Generating..."
                          : "Generate Deck"}
                      </button>
                    </div>
                  ) : (
                    <div className="max-w-xl w-full perspective-1000">
                      <div
                        className={`relative w-full h-80 bg-white rounded-2xl shadow-xl cursor-pointer transition-transform duration-500 transform-style-3d ${
                          showBack ? "rotate-y-180" : ""
                        }`}
                        onClick={() => setShowBack(!showBack)}
                        style={{
                          transformStyle: "preserve-3d",
                          transform: showBack
                            ? "rotateY(180deg)"
                            : "rotateY(0deg)",
                        }}
                      >
                        <div
                          className="absolute inset-0 backface-hidden flex items-center justify-center p-8 text-center bg-white rounded-2xl border border-gray-100"
                          style={{ backfaceVisibility: "hidden" }}
                        >
                          <div>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 block">
                              Question
                            </span>
                            <h3 className="text-2xl font-semibold text-gray-800">
                              {flashcards[flashcardIndex].front}
                            </h3>
                          </div>
                        </div>
                        <div
                          className="absolute inset-0 backface-hidden flex items-center justify-center p-8 text-center bg-indigo-50 rounded-2xl border border-indigo-100"
                          style={{
                            backfaceVisibility: "hidden",
                            transform: "rotateY(180deg)",
                          }}
                        >
                          <div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4 block">
                              Answer
                            </span>
                            <p className="text-xl text-gray-800 leading-relaxed">
                              {flashcards[flashcardIndex].back}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-8">
                        <button
                          onClick={() => {
                            setFlashcardIndex((i) => Math.max(0, i - 1));
                            setShowBack(false);
                          }}
                          disabled={flashcardIndex === 0}
                          className="text-gray-500 hover:text-indigo-600 disabled:opacity-30 font-medium"
                        >
                          Previous
                        </button>
                        <span className="text-gray-400 font-mono text-sm">
                          {flashcardIndex + 1} / {flashcards.length}
                        </span>
                        <button
                          onClick={() => {
                            setFlashcardIndex((i) =>
                              Math.min(flashcards.length - 1, i + 1)
                            );
                            setShowBack(false);
                          }}
                          disabled={flashcardIndex === flashcards.length - 1}
                          className="text-gray-500 hover:text-indigo-600 disabled:opacity-30 font-medium"
                        >
                          Next
                        </button>
                      </div>
                      <button
                        onClick={() => setFlashcards([])}
                        className="mt-12 text-gray-400 text-sm hover:text-red-500 block mx-auto underline"
                      >
                        Clear Deck
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </>
  );
};

const App = () => {
  const {
    user,
    loading,
    isAuthenticated,
    signup,
    login,
    verifyCode,
    resendCode,
    googleAuth,
    githubAuth,
  } = useAuth();
  const [authView, setAuthView] = useState("login"); // login, signup, verify
  const [pendingEmail, setPendingEmail] = useState("");

  // Handle OAuth callback on mount
  useEffect(() => {
    if (window.location.pathname === "/auth/callback") {
      // Prevent handling callback multiple times
      if (!window.__oauthCallbackProcessed) {
        window.__oauthCallbackProcessed = true;
        handleOAuthCallback();
      }
    }
  }, []);

  const handleOAuthCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const errorParam = params.get("error");

      if (errorParam) {
        toast.error(
          params.get("error_description") || "OAuth authentication failed"
        );
        setTimeout(() => {
          window.history.replaceState({}, document.title, "/");
        }, 2000);
        return;
      }

      if (!code) {
        throw new Error("No authorization code received from provider");
      }

      const provider = localStorage.getItem("oauthProvider");
      if (!provider) {
        throw new Error("OAuth provider not found in session");
      }

      // Exchange code for token using the appropriate auth method
      if (provider === "google") {
        await googleAuth(code);
      } else if (provider === "github") {
        await githubAuth(code);
      } else {
        throw new Error(`Unknown OAuth provider: ${provider}`);
      }

      localStorage.removeItem("authMode");
      localStorage.removeItem("oauthProvider");

      // Reload page to reinitialize auth with new token in localStorage
      window.location.href = "/";
    } catch (err) {
      console.error("OAuth callback error:", err);
      localStorage.removeItem("authMode");
      localStorage.removeItem("oauthProvider");

      window.location.href = "/";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <CircularProgress sx={{ color: "#2563eb" }} size={50} />
      </div>
    );
  }

  // Show OAuth callback handler
  if (window.location.pathname === "/auth/callback") {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <CircularProgress sx={{ color: "#2563eb" }} size={50} />
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === "verify") {
      return (
        <VerifyEmail
          email={pendingEmail}
          onSubmit={async (data) => {
            await verifyCode(data.email, data.code);
            setAuthView("login");
          }}
          onResend={async (data) => {
            await resendCode(data.email);
          }}
          onBack={() => setAuthView("login")}
        />
      );
    }

    return (
      <AuthForm
        onLogin={(userData) => {
          // User is now authenticated, AppContent will render
        }}
        onNeedsVerification={(email) => {
          setPendingEmail(email);
          setAuthView("verify");
        }}
      />
    );
  }

  return <AppContent />;
};

export default App;
