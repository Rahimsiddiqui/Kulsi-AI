# Version 1.0.1

**Release Date:** December 12th, 2025

## 🚀 New Features

### 🔗 Internal Note Linking

- Link notes together with `[[Note Name]]` syntax
- Searchable note dropdown for creating links
- Visual styling for internal links
- Navigation between connected notes

### 🎯 Context Menu

- Right-click menu for quick actions
- Copy, share, and download notes
- Pin/archive notes from context
- Create new notes and search
- Email notes (feature in progress)

### 📋 Improved Note Management

- Unsaved changes detection
- Warning before leaving with unsaved changes
- Visual indicators for save status
- Better note creation workflow

---

## 🐞 Bug Fixes

- Removed debug logging statements
- Fixed icon sizing classes (`w-5 h-5` → `w-h` utility)
- Fixed cursor class naming (`cursor-pointer` → `point` utility)
- Improved localStorage serialization for notes
- Fixed editor state management on note switching
- Resolved link handling in TipTapEditor

## ⚡ Performance Improvements

- Reduced console spam by removing debug logs
- Optimized note sync to MongoDB
- Better handling of internal links
- Improved editor transitions with fade effects

## 🎨 UI/UX Enhancements

- Added fade-in/fade-out transitions when switching notes
- Better visual feedback for unsaved changes
- Improved link modal with note search
- Enhanced context menu functionality
- Better button styling consistency

## 🧹 Code Quality

- Removed debug console.log statements
- Simplified logging in production
- Better error handling in services
- Improved note data validation
- Cleaner CSS utilities

---

**Version:** 1.0.1
