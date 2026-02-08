import express from 'express';
import cors from 'cors';
import path from 'path';
import { createChatRouter } from './chatbot/routes.js';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Request logging middleware (structured, redacted)
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const entry: Record<string, unknown> = {
    ts: timestamp,
    method: req.method,
    path: req.path,
    ip: req.ip,
  };
  if (req.method === 'POST' && req.path === '/chat') {
    const body = req.body as { message?: string } | undefined;
    const msg = body?.message;
    if (typeof msg === 'string') {
      entry.messagePreview = msg.slice(0, 80);
      entry.messageLength = msg.length;
    }
  }
  console.log(JSON.stringify(entry));
  next();
});

// Basic IP rate limiter (in-memory, coarse)
const rateWindowMs = 60_000;
const maxRequestsPerWindow = 40;
const ipHistory = new Map<string, number[]>();
app.use((req, res, next) => {
  const now = Date.now();
  const ip =
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'unknown';
  const timestamps = ipHistory.get(ip)?.filter((ts) => now - ts < rateWindowMs) ?? [];
  if (timestamps.length >= maxRequestsPerWindow) {
    return res.status(429).json({ error: 'Too many requests. Please slow down.' });
  }
  timestamps.push(now);
  ipHistory.set(ip, timestamps);
  next();
});

// Thin bootstrap: mount router only. All logic lives in src/chatbot/*
app.use(createChatRouter({
  gemmaUrl: process.env.GEMMA_URL || 'http://127.0.0.1:8011',
  apiBaseUrl: process.env.API_BASE_URL || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL}/api` : 'http://localhost:5000/api'),
  cwd: process.cwd(),
  dirname: __dirname,
}));

const PORT = Number(process.env.PORT || 4321);

// Start server with error handling
try {
  app.listen(PORT, () => {
    console.log(`\n🤖 ========================================`);
    console.log(`   Chatbot Service Started Successfully!`);
    console.log(`   ========================================`);
    console.log(`   🌐 Listening on: http://localhost:${PORT}`);
    console.log(`   🔗 Health Check: http://localhost:${PORT}/health`);
    console.log(`   📡 Gemma AI: ${process.env.GEMMA_URL || 'http://127.0.0.1:8011'}`);
    console.log(`   🗄️  Backend API: ${process.env.API_BASE_URL || 'http://localhost:5000/api'}`);
    console.log(`   ========================================\n`);
  }).on('error', (err: unknown) => {
    const error = err instanceof Error ? err : new Error(String(err));
    const nodeError = err as NodeJS.ErrnoException;
    console.error(`\n❌ Failed to start chatbot service on port ${PORT}:`);
    console.error(`   Error: ${error.message}`);
    if (nodeError.code === 'EADDRINUSE') {
      console.error(`   Port ${PORT} is already in use.`);
      console.error(`   Please stop the service using port ${PORT} or change the PORT environment variable.\n`);
    }
    process.exit(1);
  });
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`\n❌ Fatal error starting chatbot service:`, errorMessage);
  process.exit(1);
}
