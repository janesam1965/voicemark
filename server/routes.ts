import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookSchema, insertJournalEntrySchema, updateBookSchema, updateJournalEntrySchema } from "@shared/schema";
import { transcribeAudioBuffer } from "./openai";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure upload directory exists
  const uploadDir = path.join(process.cwd(), 'uploads', 'audio');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Serve uploaded audio files
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Books routes
  app.get('/api/books', async (req, res) => {
    try {
      const withStats = req.query.withStats === 'true';
      const books = withStats ? await storage.getBooksWithStats() : await storage.getAllBooks();
      res.json(books);
    } catch (error) {
      console.error('Error fetching books:', error);
      res.status(500).json({ error: 'Failed to fetch books' });
    }
  });

  app.get('/api/books/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const book = await storage.getBook(id);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      res.json(book);
    } catch (error) {
      console.error('Error fetching book:', error);
      res.status(500).json({ error: 'Failed to fetch book' });
    }
  });

  app.post('/api/books', async (req, res) => {
    try {
      const bookData = insertBookSchema.parse(req.body);
      const book = await storage.createBook(bookData);
      res.status(201).json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid book data', details: error.errors });
      }
      console.error('Error creating book:', error);
      res.status(500).json({ error: 'Failed to create book' });
    }
  });

  app.patch('/api/books/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const bookData = updateBookSchema.parse(req.body);
      const book = await storage.updateBook(id, bookData);
      
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      res.json(book);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid book data', details: error.errors });
      }
      console.error('Error updating book:', error);
      res.status(500).json({ error: 'Failed to update book' });
    }
  });

  app.delete('/api/books/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const success = await storage.deleteBook(id);
      if (!success) {
        return res.status(404).json({ error: 'Book not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting book:', error);
      res.status(500).json({ error: 'Failed to delete book' });
    }
  });

  app.get('/api/books/search/:query', async (req, res) => {
    try {
      const query = req.params.query;
      const books = await storage.searchBooks(query);
      res.json(books);
    } catch (error) {
      console.error('Error searching books:', error);
      res.status(500).json({ error: 'Failed to search books' });
    }
  });

  // Journal Entries routes
  app.get('/api/journal-entries', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const recent = req.query.recent === 'true';
      const favorites = req.query.favorites === 'true';

      let entries;
      if (recent && limit) {
        entries = await storage.getRecentJournalEntries(limit);
      } else if (favorites) {
        entries = await storage.getFavoriteJournalEntries();
      } else {
        entries = await storage.getAllJournalEntries();
      }

      res.json(entries);
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  app.get('/api/journal-entries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid entry ID' });
      }

      const entry = await storage.getJournalEntry(id);
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      res.json(entry);
    } catch (error) {
      console.error('Error fetching journal entry:', error);
      res.status(500).json({ error: 'Failed to fetch journal entry' });
    }
  });

  app.get('/api/books/:bookId/journal-entries', async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      if (isNaN(bookId)) {
        return res.status(400).json({ error: 'Invalid book ID' });
      }

      const entries = await storage.getJournalEntriesForBook(bookId);
      res.json(entries);
    } catch (error) {
      console.error('Error fetching journal entries for book:', error);
      res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
  });

  app.post('/api/journal-entries', upload.single('audio'), async (req, res) => {
    try {
      const { bookId, page, chapter, tags } = req.body;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      if (!bookId) {
        return res.status(400).json({ error: 'Book ID is required' });
      }

      // Transcribe audio
      console.log('Transcribing audio...');
      const transcriptionResult = await transcribeAudioBuffer(
        audioFile.buffer, 
        `audio_${Date.now()}.${audioFile.originalname.split('.').pop()}`
      );

      // Save audio file
      const filename = `${Date.now()}_${audioFile.originalname}`;
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, audioFile.buffer);
      const audioUrl = `/uploads/audio/${filename}`;

      // Parse tags if provided
      let parsedTags = null;
      if (tags) {
        try {
          parsedTags = JSON.parse(tags);
        } catch {
          parsedTags = tags.split(',').map((tag: string) => tag.trim()).filter(Boolean);
        }
      }

      // Create journal entry
      const entryData = insertJournalEntrySchema.parse({
        bookId: parseInt(bookId),
        transcription: transcriptionResult.text,
        audioUrl,
        audioLength: transcriptionResult.duration?.toString(),
        page: page ? parseInt(page) : null,
        chapter: chapter || null,
        tags: parsedTags,
      });

      const entry = await storage.createJournalEntry(entryData);
      console.log('Journal entry created successfully');

      res.status(201).json({
        ...entry,
        transcriptionResult,
      });
    } catch (error) {
      console.error('Error creating journal entry:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid entry data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create journal entry', details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch('/api/journal-entries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid entry ID' });
      }

      const entryData = updateJournalEntrySchema.parse(req.body);
      const entry = await storage.updateJournalEntry(id, entryData);
      
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid entry data', details: error.errors });
      }
      console.error('Error updating journal entry:', error);
      res.status(500).json({ error: 'Failed to update journal entry' });
    }
  });

  app.delete('/api/journal-entries/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid entry ID' });
      }

      // Get entry to delete audio file
      const entry = await storage.getJournalEntry(id);
      if (entry?.audioUrl) {
        const filepath = path.join(process.cwd(), entry.audioUrl);
        if (fs.existsSync(filepath)) {
          fs.unlinkSync(filepath);
        }
      }

      const success = await storage.deleteJournalEntry(id);
      if (!success) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      res.status(500).json({ error: 'Failed to delete journal entry' });
    }
  });

  app.post('/api/journal-entries/:id/favorite', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid entry ID' });
      }

      const entry = await storage.toggleFavoriteEntry(id);
      if (!entry) {
        return res.status(404).json({ error: 'Journal entry not found' });
      }

      res.json(entry);
    } catch (error) {
      console.error('Error toggling favorite:', error);
      res.status(500).json({ error: 'Failed to toggle favorite' });
    }
  });

  app.get('/api/journal-entries/search/:query', async (req, res) => {
    try {
      const query = req.params.query;
      const entries = await storage.searchJournalEntries(query);
      res.json(entries);
    } catch (error) {
      console.error('Error searching journal entries:', error);
      res.status(500).json({ error: 'Failed to search journal entries' });
    }
  });

  // Stats route
  app.get('/api/stats', async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
