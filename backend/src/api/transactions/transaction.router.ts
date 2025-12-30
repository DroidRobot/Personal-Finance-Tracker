import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import { TransactionService } from '@/services/transaction.service';
import { authenticate } from '@/middleware/auth';
import { AppError } from '@/middleware/errorHandler';
import { TransactionType } from '@prisma/client';
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
 * @route POST /api/transactions
 * @desc Create a new transaction
 * @access Private
 */
router.post(
  '/',
  [
    body('accountId').isString().notEmpty().withMessage('Account ID is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be a positive number'),
    body('type')
      .isIn([TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER])
      .withMessage('Invalid transaction type'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('date').isISO8601().withMessage('Invalid date format'),
    body('categoryId').optional().isString(),
    body('merchantName').optional().isString(),
    body('notes').optional().isString(),
    body('tags').optional().isArray(),
    body('receiptUrl').optional().isURL().withMessage('Invalid receipt URL'),
    body('taxDeductible').optional().isBoolean(),
    body('taxCategory').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await TransactionService.createTransaction(
        req.user!.userId,
        {
          ...req.body,
          date: new Date(req.body.date),
        }
      );
      res.status(201).json(transaction);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/transactions
 * @desc Get transactions with filters
 * @access Private
 */
router.get(
  '/',
  [
    query('accountId').optional().isString(),
    query('categoryId').optional().isString(),
    query('type').optional().isIn([TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER]),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
    query('search').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('sortBy').optional().isString(),
    query('sortOrder').optional().isIn(['asc', 'desc']),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = {
        ...req.query,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        tags: req.query.tags ? (Array.isArray(req.query.tags) ? req.query.tags : [req.query.tags]) as string[] : undefined,
      };

      const result = await TransactionService.getTransactions(req.user!.userId, query);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/transactions/statistics
 * @desc Get transaction statistics
 * @access Private
 */
router.get(
  '/statistics',
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const stats = await TransactionService.getStatistics(req.user!.userId, startDate, endDate);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route GET /api/transactions/:id
 * @desc Get a single transaction
 * @access Private
 */
router.get(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const transaction = await TransactionService.getTransaction(req.user!.userId, req.params.id);
      res.json(transaction);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route PATCH /api/transactions/:id
 * @desc Update a transaction
 * @access Private
 */
router.patch(
  '/:id',
  [
    body('accountId').optional().isString(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('type').optional().isIn([TransactionType.INCOME, TransactionType.EXPENSE, TransactionType.TRANSFER]),
    body('description').optional().trim().notEmpty(),
    body('date').optional().isISO8601(),
    body('categoryId').optional().isString(),
    body('merchantName').optional().isString(),
    body('notes').optional().isString(),
    body('tags').optional().isArray(),
    body('receiptUrl').optional().isURL(),
    body('taxDeductible').optional().isBoolean(),
    body('taxCategory').optional().isString(),
  ],
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined,
      };

      const transaction = await TransactionService.updateTransaction(
        req.user!.userId,
        req.params.id,
        data
      );
      res.json(transaction);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route DELETE /api/transactions/:id
 * @desc Delete a transaction
 * @access Private
 */
router.delete(
  '/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await TransactionService.deleteTransaction(req.user!.userId, req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
