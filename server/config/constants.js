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

export const WELCOME_NOTE_CONTENT = `
Kulsi AI is a minimal, fast, and AI-powered note-taking app.

## Features:-
- **WYSIWYG Editor**: Write with real-time visual formatting, no markdown syntax needed
- **AI Assistant**: Click the ✨ icon to improve, fix grammar, summarize, or continue writing
- **Organization**: Folders, tags, and pinned notes for easy access
- **Bi-directional Links**: Link to other notes with [[note name]]
- **Task Management**: Use checkboxes to track your to-dos

## Keyboard Shortcuts:-
### Formatting:
- **Bold**: \`Cmd+B\` or \`Ctrl+B\`
- *Italic*: \`Cmd+I\` or \`Ctrl+I\`
- __Underline__: \`Cmd+U\` or \`Ctrl+U\`
- ~~Strikethrough~~: \`Cmd+Shift+X\` or \`Ctrl+Shift+X\`
- \`Inline Code\`: \`Cmd+\` or \`Ctrl+\`

### List & Structure:
- **Bullet List**: \`Cmd+Shift+L\` or \`Ctrl+Shift+L\`
- **Checkboxes**: \`Cmd+Shift+C\` or \`Ctrl+Shift+C\`
- **Headings**: \`Cmd+Alt+1-5\` or \`Ctrl+Alt+1-5\`

### Editor:
- **New Note**: \`Cmd+N\` or \`Ctrl+N\`
- **Undo**: \`Cmd+Z\` or \`Ctrl+Z\`
- **Redo**: \`Cmd+Shift+Z\` or \`Ctrl+Shift+Z\`
- **Drawing**: \`Cmd+Shift+D\` or \`Ctrl+Shift+D\`

## Quick Start:-

### Try These Actions:
[ ] Create your first bullet list with Ctrl+Shift+L
[ ] Add a checkbox with Ctrl+Shift+C
[ ] Use the AI assistant to improve this text
[ ] Link to another note with [[Note Name]]


Start writing your next big idea...
`;
