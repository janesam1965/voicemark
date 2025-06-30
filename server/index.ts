// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from the .env file in the project root
const envPath = path.resolve(process.cwd(), '../../.env');
console.log('Loading .env from:', envPath);

dotenv.config({ path: envPath });

// Log environment variables for debugging (don't log sensitive data in production)
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '***REDACTED***' : 'NOT FOUND');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in the environment variables');
  process.exit(1);
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from 'cors';

const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: [
    'http://localhost:5002',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://10.0.2.2:5002',
    'http://10.0.2.2:3000',
    'http://10.0.2.2:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  // Log the incoming request
  console.log(`\n[${new Date().toISOString()}] Incoming ${req.method} ${path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
    
    if (path.startsWith("/api")) {
      console.log(`[${new Date().toISOString()}] Response ${req.method} ${path} ${res.statusCode}`);
      
      if (capturedJsonResponse) {
        console.log('Response Body:', JSON.stringify(capturedJsonResponse, null, 2));
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 200) {
        logLine = logLine.slice(0, 199) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the specified port or default to 5002 to avoid common port conflicts
  // Use 127.0.0.1 instead of localhost to force IPv4
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5002;
  // Listen on all network interfaces to allow connections from emulator
  const host = '0.0.0.0';
  
  server.listen(port, host, () => {
    log(`Server is running on http://${host}:${port}`);
    log(`Access the server from your computer at http://localhost:${port}`);
    log(`Access from Android emulator at http://10.0.2.2:${port}`);
    log(`NODE_ENV: ${process.env.NODE_ENV}`);
  }).on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      log(`Error: Port ${port} is already in use. Please choose another port.`);
    } else if (error.code === 'EACCES') {
      log(`Error: Permission denied. Try using a port number higher than 1024.`);
    } else {
      log(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
})();
