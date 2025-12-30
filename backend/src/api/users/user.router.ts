import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

// Placeholder for user management routes
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'User profile endpoint' });
});

export default router;
