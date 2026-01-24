import express from 'express';
import authRoutes from './auth.routes';
import documentRoutes from './document.routes';
import { config } from '../config/environment';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/documents', documentRoutes);

router.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CloudVault API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'CloudVault API is running',
    timestamp: new Date().toISOString(),
    environment: config.isDevelopment ? 'development' : 'production',
    uptime: process.uptime(),
  });
});

export default router;
