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



const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
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

  // Serve the app on the specified port or default to 5001 to avoid common port conflicts
  // Use 127.0.0.1 instead of localhost to force IPv4
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5001;
  const host = '127.0.0.1';
  
  server.listen(port, host, () => {
    log(`Server is running on http://${host}:${port}`);
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
