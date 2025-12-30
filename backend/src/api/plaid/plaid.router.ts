import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

// Placeholder for Plaid integration routes
router.post('/link', async (req: Request, res: Response, next: NextFunction) => {
  res.json({ message: 'Plaid link endpoint - to be implemented' });
});

export default router;
