import { Router } from 'express';
import chatRoutes from './chatRoutes';
import userRoutes from './userRoutes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

router.use('/chat', chatRoutes);
router.use('/user', userRoutes);

export default router;
