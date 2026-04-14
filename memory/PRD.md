# Axon Agent - PRD

## Original Problem Statement
Improve both backend and frontend: hamburger menu with chat, ability to create new chats with per-chat memory, working live preview (real E2B sandbox), better logic and frontend. Using APIs: Tavily, Groq, E2B.

## Architecture
- **Frontend**: React + TailwindCSS (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **AI/LLM**: Groq (llama-3.3-70b-versatile)
- **Code Execution**: E2B Sandbox
- **Web Search**: Tavily API

## User Personas
- **Developer**: Uses the agent to build apps, execute code, and preview results
- **Admin**: Manages the platform

## Core Requirements
1. JWT Authentication (login/register/logout)
2. Multiple chat sessions with per-chat memory (MongoDB)
3. Hamburger menu on mobile for chat navigation
4. AI agent with Groq LLM streaming responses
5. E2B sandbox for real code execution
6. Tavily web search integration
7. Live preview panel showing sandbox output
8. Dark IDE-style theme

## What's Been Implemented (2026-04-14)
- Full auth system (register, login, logout, refresh, /me)
- Admin seeding on startup
- Chat CRUD (create, list, get, delete, rename)
- Streaming AI chat endpoint with Groq
- E2B sandbox management per chat
- Tavily web search via tool calls
- React frontend with:
  - Auth page (login/register)
  - Sidebar with chat list grouped by date
  - Chat panel with message streaming, tool call display
  - Preview panel with browser-like header and iframe
  - Mobile hamburger menu and bottom tab bar
  - Dark IDE theme (IBM Plex Sans, JetBrains Mono)

## Prioritized Backlog
### P0 (Critical)
- All core features implemented

### P1 (High)
- Chat title auto-generation with AI summary
- Reconnect to existing E2B sandbox on page reload
- Better error handling for sandbox timeouts

### P2 (Nice to have)
- Code syntax highlighting in chat
- File tree viewer for sandbox
- Multiple tabs in preview
- Chat export/sharing
- Voice input

## Next Tasks
- Improve message rendering with full markdown + code highlighting
- Add sandbox status indicators (active/inactive)
- Implement chat search/filter in sidebar
