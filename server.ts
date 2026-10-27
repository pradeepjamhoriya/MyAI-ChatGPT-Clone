import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import { db } from './server/db.js';
import { apiRouter } from './server/routes.js';

dotenv.config();

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

// Core Middlewares
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logger for diagnostic debugging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path.startsWith('/api')) {
      console.log(`[HTTP] ${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler for API
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Express Error]', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    success: false,
    error: err?.message || 'Internal Server Error',
  });
});

async function startServer() {
  // Initialize Database (MySQL or persistent store)
  await db.init();

  if (!isProduction) {
    // Dynamic import of Vite in development mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
    console.log('[Server] Vite middleware integrated.');
  } else {
    // Serve pre-built static assets in production
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('[Server] Serving production build from dist/');
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(` MyAI Application Server Started `);
    console.log(` Listening on: http://localhost:${port}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Gemini Model: gemini-3.8-flash`);
    console.log(`=========================================`);
  });
}

startServer().catch((err) => {
  console.error('[Fatal Server Startup Error]', err);
  process.exit(1);
});
