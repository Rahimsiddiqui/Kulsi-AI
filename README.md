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

- Node.js 18+ and npm/yarn
- MongoDB (local or Atlas)
- Gemini API key
- (Optional) Google/GitHub OAuth credentials

### Setup Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/Rahimsiddiqui/Kulsi-AI.git
   cd Kulsi-AI
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   - `VITE_GEMINI_API_KEY` - Get from [Google AI Studio](https://aistudio.google.com)
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - Generate a strong secret
   - Other optional OAuth credentials

4. **Start the development servers**

   ```bash
   # Terminal 1 - Frontend
   npm run dev

   # Terminal 2 - Backend
   npm run server:dev
   ```

   Or run both concurrently:

   ```bash
   npm run start:all
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

## Build & Deployment

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm run server:start
```

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/verify-code` - Verify OTP
- `POST /api/auth/resend-code` - Resend verification code
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/oauth/callback` - OAuth callback

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
| `Cmd/Ctrl + ``         | Inline code        |
| `Cmd/Ctrl + Alt + 1`   | Heading 1          |
| `Cmd/Ctrl + Shift + >` | Blockquote         |
| `Cmd/Ctrl + Shift + C` | Checkbox           |
| `Cmd/Ctrl + Shift + L` | Bullet list        |
| `Cmd/Ctrl + Shift + D` | Open drawing tool  |
| `Cmd/Ctrl + Z`         | Undo               |
| `Cmd/Ctrl + Shift + Z` | Redo               |

> **Note:** All toolbar buttons execute the same functions as their keyboard shortcuts for maximum reliability

## File Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── Editor.jsx       # Main editor component
│   │   ├── AuthForm.jsx     # Authentication form
│   │   ├── TipTapEditor.jsx # Rich text editor
│   │   └── ...
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.jsx      # Auth context and hook
│   │   └── useNotes.js      # Notes state management
│   ├── services/            # API services
│   │   ├── authService.js   # Authentication API
│   │   └── geminiService.js # AI API
│   ├── App.jsx              # Root component
│   └── index.jsx            # Entry point
├── server/
│   ├── routes/              # API routes
│   ├── models/              # Database models
│   ├── middleware/          # Express middleware
│   └── index.js             # Server entry
└── package.json
```

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

## Configuration

### Environment Variables

**Frontend (.env)**

```
VITE_API_URL=http://localhost:5000
VITE_GEMINI_API_KEY=your_api_key
```

**Server (.env)**

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kulsi-ai
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
```

## Troubleshooting

### API Timeout Errors

- Check backend is running on port 5000
- Verify MONGODB_URI is correct
- Check network connectivity

### Gemini API Errors

- Verify API key is set in `.env`
- Check API key has proper permissions
- Ensure quota is not exceeded

### Authentication Issues

- Clear browser localStorage: `localStorage.clear()`
- Check JWT_SECRET is set on backend
- Verify MONGODB_URI for user data persistence

### CORS Errors

- Ensure FRONTEND_URL matches frontend URL
- Check backend CORS configuration
- Verify credentials: true in fetch requests

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

This project is private. All rights reserved.

## Support

For issues and feature requests, please contact the development team.

---

**Last Updated:** December 2025
**Version:** 1.0.0
