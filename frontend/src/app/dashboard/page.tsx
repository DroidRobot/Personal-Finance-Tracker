'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  PiggyBank,
  Calendar,
  Bell,
  ChevronRight,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Receipt,
  AlertCircle,
  Wallet,
  CircleDollarSign,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SpendingChart } from '@/components/charts/SpendingChart';
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown';
import { TrendChart } from '@/components/charts/TrendChart';
import { TransactionList } from '@/components/transactions/TransactionList';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { InsightCard } from '@/components/dashboard/InsightCard';
import { api } from '@/lib/api';

interface DashboardData {
  overview: {
    totalBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    savingsRate: number;
    netWorth: number;
    lastMonthComparison: {
      income: number;
      expenses: number;
    };
  };
  accounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: number;
    institution: string;
  }>;
  recentTransactions: Array<{
    id: string;
    description: string;
    amount: number;
    date: string;
    category: string;
    merchantName?: string;
  }>;
  budgets: Array<{
    id: string;
    name: string;
    amount: number;
    spent: number;
    category: string;
    period: string;
  }>;
  insights: Array<{
    id: string;
    type: 'warning' | 'success' | 'info';
    title: string;
    description: string;
    actionLabel?: string;
  }>;
  upcomingBills: Array<{
    id: string;
    name: string;
    amount: number;
    dueDate: string;
    isPaid: boolean;
  }>;
  goals: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: string;
    progress: number;
  }>;
}

export default function Dashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);

  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['dashboard', selectedPeriod],
    queryFn: () => api.getDashboard(selectedPeriod),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return <DashboardError error={error} />;
  }

  const { overview, accounts, recentTransactions, budgets, insights, upcomingBills, goals } = dashboardData!;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/10">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                Financial Overview
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {format(new Date(), 'EEEE, MMMM do, yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="relative"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute -top-1 -right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              </Button>
              <Button
                onClick={() => setIsAddingTransaction(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  Total Balance
                  <Wallet className="h-4 w-4 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  ${overview.totalBalance.toLocaleString()}
                </div>
                <div className="flex items-center mt-2 text-xs">
                  <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+12.5%</span>
                  <span className="text-slate-500 ml-1">from last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  Monthly Income
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  ${overview.monthlyIncome.toLocaleString()}
                </div>
                <div className="flex items-center mt-2 text-xs">
                  {overview.lastMonthComparison.income > 0 ? (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600">+{overview.lastMonthComparison.income}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                      <span className="text-red-600">{overview.lastMonthComparison.income}%</span>
                    </>
                  )}
                  <span className="text-slate-500 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  Monthly Expenses
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  ${overview.monthlyExpenses.toLocaleString()}
                </div>
                <div className="flex items-center mt-2 text-xs">
                  {overview.lastMonthComparison.expenses < 0 ? (
                    <>
                      <ArrowDownRight className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600">{Math.abs(overview.lastMonthComparison.expenses)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-3 w-3 text-red-600 mr-1" />
                      <span className="text-red-600">+{overview.lastMonthComparison.expenses}%</span>
                    </>
                  )}
                  <span className="text-slate-500 ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="relative overflow-hidden border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  Savings Rate
                  <PiggyBank className="h-4 w-4 text-purple-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {overview.savingsRate}%
                </div>
                <Progress 
                  value={overview.savingsRate} 
                  className="mt-3 h-2 bg-purple-100 dark:bg-purple-900/20"
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-8">
            {/* Spending Trends */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Spending Trends</span>
                    <Tabs value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as any)}>
                      <TabsList className="bg-slate-100 dark:bg-slate-800">
                        <TabsTrigger value="week">Week</TabsTrigger>
                        <TabsTrigger value="month">Month</TabsTrigger>
                        <TabsTrigger value="year">Year</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TrendChart period={selectedPeriod} />
                </CardContent>
              </Card>
            </motion.div>

            {/* Category Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader>
                  <CardTitle>Spending by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <CategoryBreakdown />
                </CardContent>
              </Card>
            </motion.div>

            {/* Recent Transactions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Recent Transactions
                    <Button variant="ghost" size="sm">
                      View All
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <TransactionList transactions={recentTransactions} />
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <QuickActions />
            </motion.div>

            {/* Budgets */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-lg">Monthly Budgets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {budgets.slice(0, 3).map((budget) => (
                    <BudgetCard key={budget.id} budget={budget} compact />
                  ))}
                  <Button variant="outline" className="w-full">
                    View All Budgets
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Goals */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Target className="h-5 w-5 mr-2 text-indigo-600" />
                    Financial Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {goals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{goal.name}</span>
                        <span className="text-slate-600 dark:text-slate-400">
                          ${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={goal.progress} className="h-2" />
                      <p className="text-xs text-slate-500">
                        Target: {format(new Date(goal.targetDate), 'MMM yyyy')}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Bills */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <Card className="border-0 shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-orange-600" />
                    Upcoming Bills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingBills.map((bill) => (
                      <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                        <div>
                          <p className="font-medium text-sm">{bill.name}</p>
                          <p className="text-xs text-slate-500">
                            Due {format(new Date(bill.dueDate), 'MMM d')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${bill.amount}</p>
                          {!bill.isPaid && (
                            <span className="text-xs text-orange-600">Pending</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAddingTransaction && (
          <AddTransactionModal onClose={() => setIsAddingTransaction(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// Skeleton loader component
function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20 animate-pulse">
      {/* Skeleton implementation */}
    </div>
  );
}

// Error component
function DashboardError({ error }: { error: any }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2 text-red-600 mb-4">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error Loading Dashboard</h3>
          </div>
          <p className="text-slate-600">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Add Transaction Modal component
function AddTransactionModal({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 max-w-lg w-full mx-4"
      >
        {/* Modal content implementation */}
        <h2 className="text-xl font-bold mb-4">Add Transaction</h2>
        {/* Form fields */}
      </motion.div>
    </motion.div>
  );
}
