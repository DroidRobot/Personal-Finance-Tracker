import { prisma } from '@/lib/prisma';
import { AppError } from '@/middleware/errorHandler';
import { Transaction, Prisma, TransactionType, TransactionStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';

interface CreateTransactionData {
  accountId: string;
  amount: number;
  currency?: string;
  type: TransactionType;
  description: string;
  merchantName?: string;
  categoryId?: string;
  date: Date;
  notes?: string;
  tags?: string[];
  receiptUrl?: string;
  taxDeductible?: boolean;
  taxCategory?: string;
}

interface UpdateTransactionData extends Partial<CreateTransactionData> {}

interface GetTransactionsQuery {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class TransactionService {
  /**
   * Create a new transaction
   */
  static async createTransaction(
    userId: string,
    data: CreateTransactionData
  ): Promise<Transaction> {
    // Verify account belongs to user
    const account = await prisma.account.findFirst({
      where: {
        id: data.accountId,
        userId,
      },
    });

    if (!account) {
      throw new AppError(404, 'Account not found');
    }

    // Verify category belongs to user if provided
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

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        ...data,
        userId,
        status: TransactionStatus.POSTED,
      },
      include: {
        category: true,
        account: true,
      },
    });

    // Update account balance
    await this.updateAccountBalance(data.accountId);

    return transaction;
  }

  /**
   * Get transactions with filters and pagination
   */
  static async getTransactions(
    userId: string,
    query: GetTransactionsQuery
  ): Promise<{ transactions: Transaction[]; total: number; page: number; limit: number }> {
    const {
      accountId,
      categoryId,
      type,
      startDate,
      endDate,
      search,
      tags,
      page = 1,
      limit = 20,
      sortBy = 'date',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: Prisma.TransactionWhereInput = {
      userId,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startOfDay(startDate);
      }
      if (endDate) {
        where.date.lte = endOfDay(endDate);
      }
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { merchantName: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (tags && tags.length > 0) {
      where.tags = { hasSome: tags };
    }

    // Get transactions
    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          category: true,
          account: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single transaction
   */
  static async getTransaction(userId: string, transactionId: string): Promise<Transaction> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        category: true,
        account: true,
      },
    });

    if (!transaction) {
      throw new AppError(404, 'Transaction not found');
    }

    return transaction;
  }

  /**
   * Update a transaction
   */
  static async updateTransaction(
    userId: string,
    transactionId: string,
    data: UpdateTransactionData
  ): Promise<Transaction> {
    // Check if transaction exists and belongs to user
    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!existingTransaction) {
      throw new AppError(404, 'Transaction not found');
    }

    // Verify account if being updated
    if (data.accountId) {
      const account = await prisma.account.findFirst({
        where: {
          id: data.accountId,
          userId,
        },
      });

      if (!account) {
        throw new AppError(404, 'Account not found');
      }
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

    // Update transaction
    const transaction = await prisma.transaction.update({
      where: { id: transactionId },
      data,
      include: {
        category: true,
        account: true,
      },
    });

    // Update account balance if amount or account changed
    if (data.amount !== undefined || data.accountId) {
      await this.updateAccountBalance(transaction.accountId);
      if (data.accountId && data.accountId !== existingTransaction.accountId) {
        await this.updateAccountBalance(existingTransaction.accountId);
      }
    }

    return transaction;
  }

  /**
   * Delete a transaction
   */
  static async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!transaction) {
      throw new AppError(404, 'Transaction not found');
    }

    await prisma.transaction.delete({
      where: { id: transactionId },
    });

    // Update account balance
    await this.updateAccountBalance(transaction.accountId);
  }

  /**
   * Get transaction statistics
   */
  static async getStatistics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalIncome: number;
    totalExpenses: number;
    netAmount: number;
    transactionCount: number;
    averageTransaction: number;
  }> {
    const where: Prisma.TransactionWhereInput = {
      userId,
      status: TransactionStatus.POSTED,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = startOfDay(startDate);
      }
      if (endDate) {
        where.date.lte = endOfDay(endDate);
      }
    }

    const [incomeSum, expenseSum, count] = await Promise.all([
      prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.INCOME },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { ...where, type: TransactionType.EXPENSE },
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where }),
    ]);

    const totalIncome = Number(incomeSum._sum.amount || 0);
    const totalExpenses = Number(expenseSum._sum.amount || 0);

    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: count,
      averageTransaction: count > 0 ? (totalIncome + totalExpenses) / count : 0,
    };
  }

  /**
   * Update account balance based on transactions
   */
  private static async updateAccountBalance(accountId: string): Promise<void> {
    const [incomeSum, expenseSum] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          accountId,
          type: TransactionType.INCOME,
          status: TransactionStatus.POSTED,
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          accountId,
          type: TransactionType.EXPENSE,
          status: TransactionStatus.POSTED,
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = Number(incomeSum._sum.amount || 0);
    const totalExpenses = Number(expenseSum._sum.amount || 0);
    const balance = totalIncome - totalExpenses;

    await prisma.account.update({
      where: { id: accountId },
      data: { balance },
    });
  }
}

export default TransactionService;
