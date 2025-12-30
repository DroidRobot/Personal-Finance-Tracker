import { PrismaClient, TransactionType, AccountType, BudgetPeriod } from '@prisma/client';
import { PasswordUtil } from '../utils/password';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create system categories
  console.log('Creating system categories...');
  const categories = [
    // Expense categories
    { name: 'Food & Dining', icon: '🍔', color: '#FF6B6B', type: TransactionType.EXPENSE },
    { name: 'Shopping', icon: '🛍️', color: '#4ECDC4', type: TransactionType.EXPENSE },
    { name: 'Transportation', icon: '🚗', color: '#45B7D1', type: TransactionType.EXPENSE },
    { name: 'Bills & Utilities', icon: '💡', color: '#F7B731', type: TransactionType.EXPENSE },
    { name: 'Entertainment', icon: '🎬', color: '#5F27CD', type: TransactionType.EXPENSE },
    { name: 'Healthcare', icon: '⚕️', color: '#00D2D3', type: TransactionType.EXPENSE },
    { name: 'Personal Care', icon: '💇', color: '#FD79A8', type: TransactionType.EXPENSE },
    { name: 'Education', icon: '📚', color: '#6C5CE7', type: TransactionType.EXPENSE },
    { name: 'Travel', icon: '✈️', color: '#FF7675', type: TransactionType.EXPENSE },
    { name: 'Housing', icon: '🏠', color: '#2D3436', type: TransactionType.EXPENSE },
    { name: 'Insurance', icon: '🛡️', color: '#0984E3', type: TransactionType.EXPENSE },
    { name: 'Subscriptions', icon: '📱', color: '#74B9FF', type: TransactionType.EXPENSE },
    // Income categories
    { name: 'Salary', icon: '💰', color: '#00B894', type: TransactionType.INCOME },
    { name: 'Freelance', icon: '💼', color: '#00CEC9', type: TransactionType.INCOME },
    { name: 'Investments', icon: '📈', color: '#FDCB6E', type: TransactionType.INCOME },
    { name: 'Refunds', icon: '↩️', color: '#A29BFE', type: TransactionType.INCOME },
    { name: 'Gifts', icon: '🎁', color: '#FF7675', type: TransactionType.INCOME },
    { name: 'Other Income', icon: '💵', color: '#55EFC4', type: TransactionType.INCOME },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: {
        userId_name: {
          userId: null as any,
          name: category.name,
        },
      },
      create: {
        ...category,
        isSystem: true,
        userId: null,
      },
      update: {},
    });
  }

  console.log(`✅ Created ${categories.length} system categories`);

  // Create demo user
  console.log('Creating demo user...');
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@financeflow.com' },
    create: {
      email: 'demo@financeflow.com',
      passwordHash: await PasswordUtil.hash('Demo123!@#'),
      firstName: 'Demo',
      lastName: 'User',
      emailVerified: true,
    },
    update: {},
  });

  console.log('✅ Created demo user');

  // Create demo accounts
  console.log('Creating demo accounts...');
  const checkingAccount = await prisma.account.upsert({
    where: {
      id: `demo-checking-${demoUser.id}`,
    },
    create: {
      id: `demo-checking-${demoUser.id}`,
      userId: demoUser.id,
      name: 'Main Checking',
      type: AccountType.CHECKING,
      balance: 5000,
      institution: 'Demo Bank',
    },
    update: {},
  });

  const savingsAccount = await prisma.account.upsert({
    where: {
      id: `demo-savings-${demoUser.id}`,
    },
    create: {
      id: `demo-savings-${demoUser.id}`,
      userId: demoUser.id,
      name: 'Savings Account',
      type: AccountType.SAVINGS,
      balance: 15000,
      institution: 'Demo Bank',
    },
    update: {},
  });

  const creditCard = await prisma.account.upsert({
    where: {
      id: `demo-credit-${demoUser.id}`,
    },
    create: {
      id: `demo-credit-${demoUser.id}`,
      userId: demoUser.id,
      name: 'Credit Card',
      type: AccountType.CREDIT_CARD,
      balance: -1500,
      institution: 'Demo Credit Union',
    },
    update: {},
  });

  console.log('✅ Created 3 demo accounts');

  // Get categories for demo transactions
  const foodCategory = await prisma.category.findFirst({
    where: { name: 'Food & Dining', isSystem: true },
  });

  const salaryCategory = await prisma.category.findFirst({
    where: { name: 'Salary', isSystem: true },
  });

  const shoppingCategory = await prisma.category.findFirst({
    where: { name: 'Shopping', isSystem: true },
  });

  const transportCategory = await prisma.category.findFirst({
    where: { name: 'Transportation', isSystem: true },
  });

  // Create demo transactions
  console.log('Creating demo transactions...');
  const transactions = [
    {
      userId: demoUser.id,
      accountId: checkingAccount.id,
      amount: 3500,
      type: TransactionType.INCOME,
      description: 'Monthly Salary',
      categoryId: salaryCategory?.id,
      date: new Date(2024, 0, 1),
    },
    {
      userId: demoUser.id,
      accountId: checkingAccount.id,
      amount: 45.99,
      type: TransactionType.EXPENSE,
      description: 'Grocery Store',
      merchantName: 'Whole Foods',
      categoryId: foodCategory?.id,
      date: new Date(2024, 0, 5),
    },
    {
      userId: demoUser.id,
      accountId: checkingAccount.id,
      amount: 120.50,
      type: TransactionType.EXPENSE,
      description: 'Shopping',
      merchantName: 'Amazon',
      categoryId: shoppingCategory?.id,
      date: new Date(2024, 0, 8),
    },
    {
      userId: demoUser.id,
      accountId: checkingAccount.id,
      amount: 35.00,
      type: TransactionType.EXPENSE,
      description: 'Gas Station',
      merchantName: 'Shell',
      categoryId: transportCategory?.id,
      date: new Date(2024, 0, 10),
    },
  ];

  for (const transaction of transactions) {
    await prisma.transaction.create({ data: transaction });
  }

  console.log(`✅ Created ${transactions.length} demo transactions`);

  // Create demo budgets
  console.log('Creating demo budgets...');
  const budgets = [
    {
      userId: demoUser.id,
      name: 'Food & Dining Budget',
      amount: 500,
      period: BudgetPeriod.MONTHLY,
      categoryId: foodCategory?.id,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 31),
    },
    {
      userId: demoUser.id,
      name: 'Shopping Budget',
      amount: 300,
      period: BudgetPeriod.MONTHLY,
      categoryId: shoppingCategory?.id,
      startDate: new Date(2024, 0, 1),
      endDate: new Date(2024, 0, 31),
    },
  ];

  for (const budget of budgets) {
    await prisma.budget.create({ data: budget });
  }

  console.log(`✅ Created ${budgets.length} demo budgets`);

  console.log('🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
