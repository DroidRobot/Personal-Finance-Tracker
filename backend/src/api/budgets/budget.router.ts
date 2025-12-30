import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { BudgetService } from '@/services/budget.service';
import { authenticate } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { BudgetPeriod } from '@prisma/client';
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
 * @route POST /api/budgets
 * @desc Create a new budget
 * @access Private
 */
router.post(
  '/',
  [
    body('name').trim().notEmpty().withMessage('Budget name is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('period')
      .isIn(Object.values(BudgetPeriod))
      .withMessage('Invalid budget period'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').optional().isISO8601().withMessage('Invalid end date'),
    body('categoryId').optional().isString(),
    body('rollover').optional().isBoolean(),
    body('alertEnabled').optional().isBoolean(),
    body('alertThreshold').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const budget = await BudgetService.createBudget(req.user!.userId, {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      res.status(201).json(budget);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/budgets
 * @desc Get all budgets with progress
 * @access Private
 */
router.get(
  '/',
  [query('period').optional().isIn(Object.values(BudgetPeriod))],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period as BudgetPeriod | undefined;
      const budgets = await BudgetService.getBudgets(req.user!.userId, period);
      res.json(budgets);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/budgets/alerts
 * @desc Get budget alerts
 * @access Private
 */
router.get(
  '/alerts',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const alerts = await BudgetService.getBudgetAlerts(req.user!.userId);
      res.json(alerts);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/budgets/:id
 * @desc Get a single budget with progress
 * @access Private
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const budget = await BudgetService.getBudget(req.user!.userId, req.params.id);
      res.json(budget);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PATCH /api/budgets/:id
 * @desc Update a budget
 * @access Private
 */
router.patch(
  '/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('period').optional().isIn(Object.values(BudgetPeriod)),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('categoryId').optional().isString(),
    body('rollover').optional().isBoolean(),
    body('alertEnabled').optional().isBoolean(),
    body('alertThreshold').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      };

      const budget = await BudgetService.updateBudget(req.user!.userId, req.params.id, data);
      res.json(budget);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/budgets/:id
 * @desc Delete a budget
 * @access Private
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await BudgetService.deleteBudget(req.user!.userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
