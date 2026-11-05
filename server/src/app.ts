import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { config } from './config/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { apiRouter } from './routes/index.js';

const app = express();

// ---------------------------------------------------------------------------
// Security & Logging Middleware
// ---------------------------------------------------------------------------
app.use(helmet());

// Allowed origins: supports local dev, exact Vercel production origin, and any extras in CLIENT_URL
const rawOrigins = [
  'http://localhost:5173',
  'https://client-lac-nine-92.vercel.app',
  ...(config.CLIENT_URL ? config.CLIENT_URL.split(',') : []),
];

const allowedOrigins = new Set<string>();
for (const o of rawOrigins) {
  const trimmed = o.trim();
  if (trimmed) {
    allowedOrigins.add(trimmed.replace(/\/+$/, ''));
  }
}

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. curl, server-to-server, health check probes)
    if (!origin) {
      return callback(null, true);
    }
    const normalized = origin.replace(/\/+$/, '');
    if (allowedOrigins.has(normalized)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// Body Parsing
// ---------------------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'PGfy Sales CRM API is running',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------
app.use('/api', apiRouter);

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
