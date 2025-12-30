import { prisma } from '@/lib/prisma';
import { TransactionType, TransactionStatus } from '@prisma/client';
import {
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  format,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
} from 'date-fns';

export class AnalyticsService {
  /**
   * Get dashboard overview data
   */
  static async getDashboardOverview(userId: string) {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Get current month income and expenses
    const [thisMonthIncome, thisMonthExpenses, lastMonthIncome, lastMonthExpenses, totalBalance] =
      await Promise.all([
        this.getTotalByType(userId, TransactionType.INCOME, thisMonthStart, thisMonthEnd),
        this.getTotalByType(userId, TransactionType.EXPENSE, thisMonthStart, thisMonthEnd),
        this.getTotalByType(userId, TransactionType.INCOME, lastMonthStart, lastMonthEnd),
        this.getTotalByType(userId, TransactionType.EXPENSE, lastMonthStart, lastMonthEnd),
        this.getTotalBalance(userId),
      ]);

    // Calculate month-over-month comparison
    const incomeChange = lastMonthIncome > 0
      ? ((thisMonthIncome - lastMonthIncome) / lastMonthIncome) * 100
      : 0;
    const expenseChange = lastMonthExpenses > 0
      ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
      : 0;

    // Calculate savings rate
    const savingsRate = thisMonthIncome > 0
      ? ((thisMonthIncome - thisMonthExpenses) / thisMonthIncome) * 100
      : 0;

    return {
      totalBalance,
      monthlyIncome: thisMonthIncome,
      monthlyExpenses: thisMonthExpenses,
      savingsRate: Math.max(0, savingsRate),
      netWorth: totalBalance,
      lastMonthComparison: {
        income: incomeChange,
        expenses: expenseChange,
      },
    };
  }

  /**
   * Get spending by category
   */
  static async getSpendingByCategory(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ category: string; amount: number; percentage: number; count: number }[]> {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        status: TransactionStatus.POSTED,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: true,
      },
    });

    // Group by category
    const categoryMap = new Map<string, { amount: number; count: number }>();
    let total = 0;

    for (const transaction of transactions) {
      const categoryName = transaction.category?.name || 'Uncategorized';
      const amount = Number(transaction.amount);
      total += amount;

      const existing = categoryMap.get(categoryName) || { amount: 0, count: 0 };
      categoryMap.set(categoryName, {
        amount: existing.amount + amount,
        count: existing.count + 1,
      });
    }

    // Convert to array and calculate percentages
    const result = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: total > 0 ? (data.amount / total) * 100 : 0,
    }));

    // Sort by amount descending
    result.sort((a, b) => b.amount - a.amount);

    return result;
  }

  /**
   * Get spending trends over time
   */
  static async getSpendingTrends(
    userId: string,
    period: 'week' | 'month' | 'year'
  ): Promise<{ date: string; income: number; expenses: number; net: number }[]> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;
    let intervals: Date[];

    if (period === 'week') {
      startDate = startOfWeek(now);
      endDate = endOfWeek(now);
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
    } else if (period === 'month') {
      startDate = startOfMonth(now);
      endDate = endOfMonth(now);
      intervals = eachDayOfInterval({ start: startDate, end: endDate });
    } else {
      // year
      startDate = startOfYear(now);
      endDate = endOfYear(now);
      intervals = eachMonthOfInterval({ start: startDate, end: endDate });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group transactions by interval
    const data = intervals.map((interval) => {
      const intervalStart = period === 'year' ? startOfMonth(interval) : interval;
      const intervalEnd = period === 'year' ? endOfMonth(interval) : interval;

      const intervalTransactions = transactions.filter((t) => {
        const tDate = new Date(t.date);
        return tDate >= intervalStart && tDate <= intervalEnd;
      });

      const income = intervalTransactions
        .filter((t) => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      const expenses = intervalTransactions
        .filter((t) => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + Number(t.amount), 0);

      return {
        date: format(interval, period === 'year' ? 'MMM yyyy' : 'MMM dd'),
        income,
        expenses,
        net: income - expenses,
      };
    });

    return data;
  }

  /**
   * Get monthly summary report
   */
  static async getMonthlySummary(userId: string, month: Date) {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    const [income, expenses, categoryBreakdown, transactionCount] = await Promise.all([
      this.getTotalByType(userId, TransactionType.INCOME, monthStart, monthEnd),
      this.getTotalByType(userId, TransactionType.EXPENSE, monthStart, monthEnd),
      this.getSpendingByCategory(userId, monthStart, monthEnd),
      prisma.transaction.count({
        where: {
          userId,
          status: TransactionStatus.POSTED,
          date: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      }),
    ]);

    return {
      month: format(month, 'MMMM yyyy'),
      income,
      expenses,
      net: income - expenses,
      savingsRate: income > 0 ? ((income - expenses) / income) * 100 : 0,
      transactionCount,
      categoryBreakdown,
      topCategories: categoryBreakdown.slice(0, 5),
    };
  }

  /**
   * Get year-to-date summary
   */
  static async getYearToDateSummary(userId: string) {
    const now = new Date();
    const yearStart = startOfYear(now);
    const yearEnd = now;

    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    const monthlySummaries = await Promise.all(
      months.map((month) => this.getMonthlySummary(userId, month))
    );

    const totalIncome = monthlySummaries.reduce((sum, m) => sum + m.income, 0);
    const totalExpenses = monthlySummaries.reduce((sum, m) => sum + m.expenses, 0);

    return {
      year: format(now, 'yyyy'),
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      averageMonthlyIncome: totalIncome / months.length,
      averageMonthlyExpenses: totalExpenses / months.length,
      monthlySummaries,
    };
  }

  /**
   * Get recent transactions
   */
  static async getRecentTransactions(userId: string, limit: number = 10) {
    return await prisma.transaction.findMany({
      where: {
        userId,
        status: TransactionStatus.POSTED,
      },
      include: {
        category: true,
        account: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        date: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get total balance across all accounts
   */
  private static async getTotalBalance(userId: string): Promise<number> {
    const result = await prisma.account.aggregate({
      where: {
        userId,
        isActive: true,
      },
      _sum: {
        balance: true,
      },
    });

    return Number(result._sum.balance || 0);
  }

  /**
   * Get total amount by transaction type
   */
  private static async getTotalByType(
    userId: string,
    type: TransactionType,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const result = await prisma.transaction.aggregate({
      where: {
        userId,
        type,
        status: TransactionStatus.POSTED,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount || 0);
  }
}

export default AnalyticsService;
