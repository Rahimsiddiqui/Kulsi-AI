# Kulsi AI — Note-Taking App

Kulsi AI is a full-featured note-taking application with an AI writing assistant, rich-text editing, drawing tools, a command palette, and organized note management. It is designed for speed, clarity, and a consistent writing experience across all devices.

---

## ✨ Features

- **AI Writing Assistant**  
  Summaries, grammar correction, auto-tagging, and content continuation
- **Rich Text and Markdown Editing** using TipTap
- **Note Management** with folders, tags, search, and trash
- **Drawing Canvas** and code syntax highlighting
- **Flashcards** and **Graph View**
- **Command Palette** (`Cmd/Ctrl + K`)
- **Keyboard Shortcuts**
- **Responsive UI** for mobile, tablet, and desktop
- **Email and OAuth Authentication** (Google, GitHub)

---

## 🧰 Tech Stack

### Frontend

- React 19
- Vite
- TipTap
- Tailwind CSS
- Framer Motion
- React Router
- Lucide Icons

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- JWT Authentication
- Gemini API
- CORS

---

## ⚡ Prerequisites

- Node.js **18+**
- MongoDB Atlas account
- Gemini API Key
- Google/GitHub OAuth credentials

---

## 📦 Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd Kulsi-AI
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure ENV Variables**

```bash
VITE_GEMINI_API_KEY=your_gemini_api_key

JWT_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri

VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GITHUB_CLIENT_ID=your_github_client_id
VITE_GITHUB_CLIENT_SECRET=your_github_client_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

## ▶️ Running The Project

### Development

```bash
npm run dev:all
```

### Production

```bash
npm run build:all
```

## ⌨ Quick Keyboard Shortcuts

| Shortcut                       | Action               |
| ------------------------------ | -------------------- |
| `Ctrl+K` / `Cmd+K`             | Open Command Palette |
| `Ctrl+N` / `Cmd+N`             | Create New Note      |
| `Ctrl+\` / `Cmd+\`             | Toggle Sidebar       |
| `Right-Click`                  | Open Context Menu    |
| `Ctrl+B` / `Cmd+B`             | Bold Text            |
| `Ctrl+I` / `Cmd+I`             | Italic Text          |
| `Ctrl+U` / `Cmd+U`             | Underline Text       |
| `Ctrl+Shift+C` / `Cmd+Shift+C` | Inline Code          |
| `Ctrl+Alt+1` / `Cmd+Alt+1`     | Heading 1            |
| `Ctrl+Alt+2` / `Cmd+Alt+2`     | Heading 2            |
| `Ctrl+Alt+3` / `Cmd+Alt+3`     | Heading 3            |
| `Ctrl+Alt+4` / `Cmd+Alt+4`     | Heading 4            |
| `Ctrl+Alt+5` / `Cmd+Alt+5`     | Heading 5            |
| `Ctrl+Alt+6` / `Cmd+Alt+6`     | Heading 6            |
| `Ctrl+Shift+B` / `Cmd+Shift+B` | Bullet List          |
| `Ctrl+Shift+O` / `Cmd+Shift+O` | Numbered List        |
| `Ctrl+C` / `Cmd+C`             | Copy Selection       |
| `Ctrl+X` / `Cmd+X`             | Cut                  |
| `Ctrl+V` / `Cmd+V`             | Paste                |

## 📄 License

**Private project — All rights reserved.**
