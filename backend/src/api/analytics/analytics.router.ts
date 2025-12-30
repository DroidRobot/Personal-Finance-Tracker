import { Router } from 'express';
import { query, validationResult } from 'express-validator';
import { AnalyticsService } from '@/services/analytics.service';
import { authenticate } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { Request, Response, NextFunction } from 'express';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(400, errors.array()[0].msg));
  }
  next();
};

/**
 * @route GET /api/analytics/dashboard
 * @desc Get dashboard overview data
 * @access Private
 */
router.get(
  '/dashboard',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const overview = await AnalyticsService.getDashboardOverview(req.user!.userId);
      res.json(overview);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/analytics/spending-by-category
 * @desc Get spending breakdown by category
 * @access Private
 */
router.get(
  '/spending-by-category',
  [
    query('startDate').isISO8601().withMessage('Invalid start date'),
    query('endDate').isISO8601().withMessage('Invalid end date'),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startDate = new Date(req.query.startDate as string);
      const endDate = new Date(req.query.endDate as string);

      const data = await AnalyticsService.getSpendingByCategory(
        req.user!.userId,
        startDate,
        endDate
      );
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/analytics/trends
 * @desc Get spending trends
 * @access Private
 */
router.get(
  '/trends',
  [query('period').isIn(['week', 'month', 'year']).withMessage('Invalid period')],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period as 'week' | 'month' | 'year';
      const data = await AnalyticsService.getSpendingTrends(req.user!.userId, period);
      res.json(data);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/analytics/monthly-summary
 * @desc Get monthly summary report
 * @access Private
 */
router.get(
  '/monthly-summary',
  [query('month').optional().isISO8601()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const month = req.query.month ? new Date(req.query.month as string) : new Date();
      const summary = await AnalyticsService.getMonthlySummary(req.user!.userId, month);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/analytics/year-to-date
 * @desc Get year-to-date summary
 * @access Private
 */
router.get(
  '/year-to-date',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const summary = await AnalyticsService.getYearToDateSummary(req.user!.userId);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/analytics/recent-transactions
 * @desc Get recent transactions
 * @access Private
 */
router.get(
  '/recent-transactions',
  [query('limit').optional().isInt({ min: 1, max: 100 }).toInt()],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const transactions = await AnalyticsService.getRecentTransactions(req.user!.userId, limit);
      res.json(transactions);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
