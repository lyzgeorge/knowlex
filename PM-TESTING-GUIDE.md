# 🚀 Knowlex Desktop - PM Testing Guide

## Quick Setup (5 minutes)

### 1. Configure API Key
1. Open `.env` file in the project root
2. Get an OpenAI API key from https://platform.openai.com/api-keys
3. Replace `your_openai_api_key_here` with your actual API key
4. Save the file

### 2. Start the Application
```bash
pnpm install
pnpm dev
```

## 🧪 What You Can Test (Tasks 1-6, 10-19 Complete)

### ✅ Project Management (Tasks 1-6)
- **Create Projects**: Click "+" next to "Projects" in sidebar
- **View Projects**: See project list in left sidebar  
- **Project Navigation**: Click to expand/collapse projects
- **Project Operations**: Hover over projects to see management options

### ✅ Conversation Management (Tasks 1-6)
- **Create Conversations**: 
  - Click "New Chat" button (creates general conversation)
  - Right-click project → "Add Conversation" (creates project conversation)
- **View Conversations**: See conversations in sidebar under projects or "Chats" section
- **Switch Conversations**: Click any conversation to switch to it
- **Conversation Operations**: Hover for rename, delete, move options

### ✅ Chat Interface (Tasks 17-19)
- **Send Messages**: Type in input box at bottom, press Enter or click send button
- **File Upload**: 
  - Click paperclip icon to select files (.txt, .md only, max 1MB, max 10 files)
  - Drag and drop files directly onto input area
- **Message Operations**: Hover over any message to see action menu:
  - **Copy**: Copy message content to clipboard
  - **Edit & Retry**: Edit user messages and regenerate response
  - **Regenerate**: Generate new AI response (for AI messages)
  - **Fork**: Create new conversation branch from this point
  - **Delete**: Remove message with confirmation

### ✅ UI Components (Tasks 10-19)
- **Sidebar Navigation**: Expandable projects, conversation switching
- **Empty States**: Welcome screen when no conversation selected
- **Loading States**: Spinners during message sending
- **Error Handling**: Toast notifications for errors
- **Responsive Layout**: Sidebar + chat interface layout
- **Dark/Light Mode**: Should adapt to system theme

## 🔍 Testing Scenarios

### Basic Flow Test
1. **Create a Project**: Click "+" next to Projects, name it "Test Project"
2. **Create Conversation**: Click "New Chat" or expand project and add conversation
3. **Send Message**: Type "Hello, how are you?" and send
4. **Expected**: You should see your message + AI response (or echo message if API not configured)
5. **Test File Upload**: Try uploading a .txt or .md file
6. **Test Message Operations**: Try copying, regenerating, or forking a message

### Advanced Flow Test
1. **Multiple Projects**: Create 2-3 projects with different names
2. **Move Conversations**: Move a conversation between projects
3. **Fork Conversation**: Send a few messages, then fork from middle message
4. **File Upload**: Upload multiple files and send with message
5. **Message Operations**: Edit a message, regenerate responses, delete messages

## 🐛 Known Limitations (Expected)

### AI Model Integration
- **Without API Key**: Messages will return echo responses for testing
- **With API Key**: Should get actual AI responses from OpenAI/Claude

### File Processing 
- **File Types**: Only .txt and .md files supported (by design)
- **File Size**: 1MB limit per file, 10 files max per message
- **RAG Processing**: File content processing not yet integrated with AI responses

### Features Not Yet Implemented
- **Project Memory**: Project-specific context/memory (Task 22)
- **RAG Search**: File content search and citations (Task 25)
- **Settings UI**: API configuration interface (Task 27)
- **Real AI Integration**: Actual streaming AI responses (Tasks 11-12)

## 🆘 Troubleshooting

### App Won't Start
- Make sure Node.js 18+ is installed
- Run `pnpm install` first
- Check console for error messages

### No AI Responses
- Check `.env` file has correct API key
- Restart app after changing `.env`
- Without API key: expect echo responses (this is normal for testing)

### File Upload Issues
- Only .txt and .md files accepted
- Maximum 1MB per file
- Files show in preview cards before sending

### Database Issues
- Delete `data/knowlex.db` and restart app to reset
- Check console logs for database errors

## ✨ Success Criteria

You should be able to:
- ✅ Create and manage projects
- ✅ Create and switch between conversations  
- ✅ Send messages and see responses
- ✅ Upload files with messages
- ✅ Use all message operations (copy, edit, regenerate, fork, delete)
- ✅ Navigate the interface smoothly
- ✅ See proper error messages when things go wrong

## 📊 Architecture Verification

The testing verifies these completed systems:
- **Database Layer** (Tasks 1-4): SQLite with migrations
- **Project Management** (Tasks 5-6): Full CRUD operations
- **UI Foundation** (Tasks 10-15): React + Chakra UI + Zustand
- **Navigation** (Task 16): Sidebar with project/conversation tree
- **Chat Interface** (Tasks 17-19): Complete chat experience with file upload and message operations

Ready to test? Start with the Quick Setup above! 🚀