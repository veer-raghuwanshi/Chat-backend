import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve static UI assets from public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      console.log(`[${req.method}] ${req.originalUrl} ${res.statusCode} (${Date.now() - start}ms)`);
    });
    next();
  });

  app.use('/', routes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
  });

  app.use(errorHandler);

  return app;
}
