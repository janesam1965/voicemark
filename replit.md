# VoiceMark - Voice Note Reading Journal

## Overview

VoiceMark is a modern web application that combines the tactile enjoyment of reading physical books with the convenience of digital note-taking and journaling. Users can record voice notes while reading, which are automatically transcribed to text and organized by book, creating a searchable journal of their reading experience.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **UI Framework**: Shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system
- **Form Handling**: React Hook Form with Zod validation
- **Mobile-First Design**: Responsive design optimized for mobile devices

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **File Storage**: Local filesystem for audio files
- **Audio Processing**: OpenAI Whisper API for speech-to-text transcription
- **API Design**: RESTful API endpoints

### Build System
- **Frontend Bundler**: Vite with React plugin
- **Development**: Hot module replacement (HMR) in development
- **TypeScript**: Full TypeScript support with strict configuration
- **Production Build**: Optimized builds with code splitting

## Key Components

### Database Schema
- **Books Table**: Stores book metadata (title, author, ISBN, reading progress, status)
- **Journal Entries Table**: Stores transcribed notes with audio references
- **Relations**: One-to-many relationship between books and journal entries

### Audio System
- **Recording**: Browser-based audio recording using MediaRecorder API
- **Storage**: Audio files stored locally in `/uploads/audio/` directory
- **Transcription**: OpenAI Whisper API integration for speech-to-text
- **Playback**: Custom audio player component with controls

### User Interface
- **Mobile-Optimized**: Phone container layout with status bar simulation
- **Navigation**: Bottom navigation bar for mobile-first experience
- **Components**: Modular UI components using Shadcn/ui design system
- **Pages**: Home, Recording, Journal, Library, and 404 error handling

### Data Management
- **CRUD Operations**: Full create, read, update, delete for books and journal entries
- **Search**: Text search across journal entries and books
- **Favorites**: Bookmark system for important journal entries
- **Statistics**: Reading progress tracking and analytics

## Data Flow

1. **Book Management**: Users add books to their library with metadata
2. **Voice Recording**: Real-time audio recording while reading
3. **Transcription**: Audio automatically sent to OpenAI Whisper for transcription
4. **Storage**: Audio files stored locally, transcriptions stored in database
5. **Organization**: Notes linked to specific books, pages, and chapters
6. **Retrieval**: Search and filter functionality across all journal entries

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL database connection
- **openai**: OpenAI API client for Whisper transcription
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management
- **wouter**: Lightweight React routing

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Type-safe variant styling
- **react-hook-form**: Form state management
- **@hookform/resolvers**: Form validation resolvers

### Development Dependencies
- **typescript**: Type checking and development experience
- **vite**: Fast build tool and development server
- **drizzle-kit**: Database schema management and migrations

## Deployment Strategy

### Environment Setup
- **Database**: Requires `DATABASE_URL` environment variable for Neon connection
- **OpenAI**: Requires `OPENAI_API_KEY` for transcription services
- **File System**: Local storage for audio files (not suitable for serverless)

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: esbuild bundles Express server to `dist/index.js`
3. **Database**: Drizzle migrations applied via `db:push` command

### Production Considerations
- File upload handling requires persistent storage
- Audio transcription has API rate limits and costs
- Database migrations need to be managed in production
- Session storage uses PostgreSQL for persistence

## Changelog
- June 29, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.