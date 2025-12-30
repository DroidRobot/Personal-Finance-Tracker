import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

// Get all accounts
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accounts = await prisma.account.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

// Create account
router.post('/', [
  body('name').trim().notEmpty(),
  body('type').isIn(['CHECKING', 'SAVINGS', 'CREDIT_CARD', 'INVESTMENT', 'LOAN', 'MORTGAGE', 'OTHER']),
  body('balance').isFloat(),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await prisma.account.create({
      data: {
        ...req.body,
        userId: req.user!.userId,
      },
    });
    res.status(201).json(account);
  } catch (error) {
    next(error);
  }
});

// Update account
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const account = await prisma.account.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      data: req.body,
    });
    if (account.count === 0) throw new AppError(404, 'Account not found');
    res.json({ message: 'Account updated' });
  } catch (error) {
    next(error);
  }
});

// Delete account
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.account.deleteMany({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
