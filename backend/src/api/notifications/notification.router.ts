import { Router } from 'express';
import { authenticate } from '@/middleware/auth';
import { prisma } from '@/lib/prisma';
import { Request, Response, NextFunction } from 'express';

const router = Router();
router.use(authenticate);

// Get notifications
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Mark as read
router.patch('/:id/read', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: {
        id: req.params.id,
        userId: req.user!.userId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
