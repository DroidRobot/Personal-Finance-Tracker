import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { Budget, BudgetPeriod, Prisma, TransactionStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, addMonths } from 'date-fns';

interface CreateBudgetData {
  name: string;
  amount: number;
  period: BudgetPeriod;
  startDate: Date;
  endDate?: Date;
  categoryId?: string;
  rollover?: boolean;
  alertEnabled?: boolean;
  alertThreshold?: number;
}

interface BudgetWithProgress extends Budget {
  spent: number;
  remaining: number;
  percentageUsed: number;
  isOverBudget: boolean;
}

export class BudgetService {
  /**
   * Create a new budget
   */
  static async createBudget(userId: string, data: CreateBudgetData): Promise<Budget> {
    // Verify category if provided
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          OR: [{ userId }, { isSystem: true }],
        },
      });

      if (!category) {
        throw new AppError(404, 'Category not found');
      }
    }

    const budget = await prisma.budget.create({
      data: {
        ...data,
        userId,
      },
      include: {
        category: true,
      },
    });

    return budget;
  }

  /**
   * Get budgets with spending progress
   */
  static async getBudgets(
    userId: string,
    period?: BudgetPeriod
  ): Promise<BudgetWithProgress[]> {
    const where: Prisma.BudgetWhereInput = { userId };
    if (period) {
      where.period = period;
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calculate spending for each budget
    const budgetsWithProgress = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.calculateSpending(userId, budget);
        const remaining = Number(budget.amount) - spent;
        const percentageUsed = (spent / Number(budget.amount)) * 100;
        const isOverBudget = spent > Number(budget.amount);

        return {
          ...budget,
          spent,
          remaining,
          percentageUsed,
          isOverBudget,
        };
      })
    );

    return budgetsWithProgress;
  }

  /**
   * Get a single budget with progress
   */
  static async getBudget(userId: string, budgetId: string): Promise<BudgetWithProgress> {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
      include: {
        category: true,
      },
    });

    if (!budget) {
      throw new AppError(404, 'Budget not found');
    }

    const spent = await this.calculateSpending(userId, budget);
    const remaining = Number(budget.amount) - spent;
    const percentageUsed = (spent / Number(budget.amount)) * 100;
    const isOverBudget = spent > Number(budget.amount);

    return {
      ...budget,
      spent,
      remaining,
      percentageUsed,
      isOverBudget,
    };
  }

  /**
   * Update a budget
   */
  static async updateBudget(
    userId: string,
    budgetId: string,
    data: Partial<CreateBudgetData>
  ): Promise<Budget> {
    const existingBudget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!existingBudget) {
      throw new AppError(404, 'Budget not found');
    }

    // Verify category if being updated
    if (data.categoryId) {
      const category = await prisma.category.findFirst({
        where: {
          id: data.categoryId,
          OR: [{ userId }, { isSystem: true }],
        },
      });

      if (!category) {
        throw new AppError(404, 'Category not found');
      }
    }

    const budget = await prisma.budget.update({
      where: { id: budgetId },
      data,
      include: {
        category: true,
      },
    });

    return budget;
  }

  /**
   * Delete a budget
   */
  static async deleteBudget(userId: string, budgetId: string): Promise<void> {
    const budget = await prisma.budget.findFirst({
      where: {
        id: budgetId,
        userId,
      },
    });

    if (!budget) {
      throw new AppError(404, 'Budget not found');
    }

    await prisma.budget.delete({
      where: { id: budgetId },
    });
  }

  /**
   * Get budget alerts
   */
  static async getBudgetAlerts(
    userId: string
  ): Promise<{ budget: BudgetWithProgress; message: string }[]> {
    const budgets = await this.getBudgets(userId);
    const alerts: { budget: BudgetWithProgress; message: string }[] = [];

    for (const budget of budgets) {
      if (!budget.alertEnabled) continue;

      const threshold = budget.alertThreshold || 80;

      if (budget.isOverBudget) {
        alerts.push({
          budget,
          message: `You've exceeded your ${budget.name} budget by $${Math.abs(budget.remaining).toFixed(2)}`,
        });
      } else if (budget.percentageUsed >= threshold) {
        alerts.push({
          budget,
          message: `You've used ${budget.percentageUsed.toFixed(0)}% of your ${budget.name} budget`,
        });
      }
    }

    return alerts;
  }

  /**
   * Calculate spending for a budget
   */
  private static async calculateSpending(userId: string, budget: Budget): Promise<number> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      type: 'EXPENSE',
      status: TransactionStatus.POSTED,
      date: {
        gte: budget.startDate,
      },
    };

    if (budget.endDate) {
      where.date!.lte = budget.endDate;
    }

    if (budget.categoryId) {
      where.categoryId = budget.categoryId;
    }

    const result = await prisma.transaction.aggregate({
      where,
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }
}

export default BudgetService;
