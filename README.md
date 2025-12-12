# Kulsi AI - Intelligent Note Taking Application

A modern, AI-powered note-taking application built with React, TipTap editor, and Gemini AI. Features real-time markdown editing, AI-powered content enhancement, flashcard generation, and a responsive UI.

## Features

- ✨ **AI-Powered Writing Assistant**

  - Improve writing quality
  - Fix grammar and spelling
  - Summarize content
  - Generate to-do lists
  - Continue writing creatively
  - Auto-tag notes

- 📝 **Rich Text Editing**

  - Real-time markdown rendering
  - TipTap editor with formatting toolbar
  - Drawing canvas for sketches
  - Code syntax highlighting
  - Checkbox support

- 🎯 **Note Organization**

  - Folders and sub-folders
  - Pin important notes
  - Trash management
  - Search functionality
  - Tag system

- 📱 **Responsive Design**

  - Mobile-optimized UI
  - Tablet support
  - Desktop-first design
  - Collapsible sidebar
  - Touch-friendly controls

- 🔐 **Authentication**

  - Email/password registration
  - Email verification with OTP
  - OAuth support (Google, GitHub)
  - Session management
  - Secure token handling

- 🎨 **Additional Features**
  - Flashcard generation
  - Graph view of notes
  - Command palette (Cmd+K)
  - Keyboard shortcuts
  - Dark mode (coming soon)
  - Sync across devices

## Tech Stack

### Frontend

- **React 19** - UI framework
- **Vite** - Build tool
- **TipTap** - Rich text editor
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Router** - Navigation
- **Lucide React** - Icons

### Backend

- **Node.js + Express** - Server
- **MongoDB + Mongoose** - Database
- **JWT** - Authentication
- **Gemini API** - AI features
- **CORS** - Cross-origin support

## Installation

### Prerequisites

- Node.js 18+ and npm
- MongoDB Atlas
- Gemini API key
- Google/GitHub OAuth credentials

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut       | Action               |
| -------------- | -------------------- |
| `Cmd/Ctrl + K` | Open command palette |
| `Cmd/Ctrl + N` | Create new note      |

### Editor Shortcuts (Within Note)

| Shortcut               | Action             |
| ---------------------- | ------------------ |
| `Cmd/Ctrl + B`         | Bold text          |
| `Cmd/Ctrl + I`         | Italic text        |
| `Cmd/Ctrl + U`         | Underline text     |
| `Cmd/Ctrl + Shift + X` | Strikethrough text |
| `Cmd/Ctrl + Backtick`  | Inline code        |
| `Cmd/Ctrl + L`         | Link               |
| `Cmd/Ctrl + Alt + 1`   | Heading 1          |
| `Cmd/Ctrl + Shift + B` | Blockquote         |
| `Cmd/Ctrl + Shift + C` | Checkbox           |
| `Cmd/Ctrl + Shift + L` | Bullet list        |
| `Cmd/Ctrl + Shift + D` | Open drawing tool  |
| `Cmd/Ctrl + Z`         | Undo               |
| `Cmd/Ctrl + Shift + Z` | Redo               |
| `Cmd/Ctrl + Shift + D` | Open drawing tool  |
| `Cmd/Ctrl + Z`         | Undo               |
| `Cmd/Ctrl + Shift + Z` | Redo               |

## Best Practices & Recent Improvements

### Bug Fixes

- ✅ Fixed missing dependency arrays in hooks
- ✅ Added proper error handling with timeouts
- ✅ Fixed null/undefined checks throughout app
- ✅ Improved search performance with memoization
- ✅ Added input validation and sanitization

### Performance Optimizations

- ✅ Memoized heavy computations
- ✅ Debounced autosave
- ✅ Optimized re-renders with useCallback
- ✅ Lazy loaded GraphView component
- ✅ Efficient note filtering

### Accessibility

- ✅ Added ARIA labels to form inputs
- ✅ Improved keyboard navigation
- ✅ Added error roles and live regions
- ✅ Enhanced color contrast
- ✅ Better form validation messages

### Code Quality

- ✅ Proper error handling
- ✅ Request timeouts (10 seconds default)
- ✅ Input validation for all forms
- ✅ Consistent error messages
- ✅ Improved type safety

## License

This project is private. All rights reserved.

**Last Updated:** December 12th 2025
**Version:** 1.0.0
