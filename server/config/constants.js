import { FolderType } from "./types.js";
import {
  Layout,
  Star,
  Trash2,
  User,
  Briefcase,
  Lightbulb,
  Network,
  CreditCard,
} from "lucide-react";

export const INITIAL_FOLDERS = [
  { id: FolderType.ALL, name: "All Notes", icon: "Layout", type: "system" },
  { id: FolderType.FAVORITES, name: "Favorites", icon: "Star", type: "system" },
  { id: FolderType.PERSONAL, name: "Personal", icon: "User", type: "user" },
  { id: FolderType.WORK, name: "Work", icon: "Briefcase", type: "user" },
  { id: FolderType.IDEAS, name: "Ideas", icon: "Lightbulb", type: "user" },
  { id: FolderType.TRASH, name: "Trash", icon: "Trash2", type: "system" },
];

export const INITIAL_NOTE_ID = "welcome-note";

export const WELCOME_NOTE_CONTENT = `Kulsi AI is a minimal, fast, and AI-powered note-taking app.

## Features

- **WYSIWYG Editor**: Write with real-time visual formatting, no markdown syntax.
- **AI Powers**: Click the ✨ icon to summarize or improve your writing.
- **Organization**: Folders, tags, and pinned notes.
- **Bi-directional Links**: Link to other notes easily.

## Keyboard Shortcuts

### Formatting
- **Bold**: Cmd+B or Ctrl+B
- *Italic*: Cmd+I or Ctrl+I
- __Underline__: Cmd+U or Ctrl+U
- ~~Strikethrough~~: Cmd+Shift+X or Ctrl+Shift+X

### Application
- New Note: Cmd+N or Ctrl+N
- Undo: Cmd+Z or Ctrl+Z
- Redo: Cmd+Y or Ctrl+Y

Start writing your next big idea...
`;
