import { Router } from 'express';
import { body } from 'express-validator';
import { authenticate } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

// Get all categories (system + user)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { isSystem: true }
        ],
        isActive: true,
      },
      include: {
        children: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/', [
  body('name').trim().notEmpty(),
  body('type').isIn(['INCOME', 'EXPENSE', 'TRANSFER']),
], async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.create({
      data: {
        ...req.body,
        userId: req.user!.userId,
      },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
});

// Update category
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = await prisma.category.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      data: req.body,
    });
    if (category.count === 0) throw new AppError(404, 'Category not found');
    res.json({ message: 'Category updated' });
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.category.deleteMany({
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
