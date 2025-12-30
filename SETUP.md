# FinanceFlow - Setup Guide

## 🚀 Quick Start with Docker (Recommended)

The easiest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/yourusername/financeflow.git
cd financeflow

# Start all services
docker-compose up

# In a new terminal, run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed the database with demo data
docker-compose exec backend npm run db:seed
```

Access the application:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **pgAdmin**: http://localhost:5050 (email: admin@financeflow.com, password: admin)
- **Redis Commander**: http://localhost:8081

Demo login:
- Email: `demo@financeflow.com`
- Password: `Demo123!@#`

## 📦 Manual Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Git

### 1. Clone and Install

```bash
# Clone repository
git clone https://github.com/yourusername/financeflow.git
cd financeflow

# Install root dependencies
npm install

# Install workspace dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../shared && npm install
```

### 2. Database Setup

```bash
# Start PostgreSQL and Redis (or use Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=financeflow_password -e POSTGRES_DB=financeflow_db --name financeflow-postgres postgres:15-alpine
docker run -d -p 6379:6379 --name financeflow-redis redis:7-alpine

# Run migrations
cd backend
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Seed database (optional)
npm run db:seed
```

### 3. Environment Configuration

#### Backend (.env)

Create `backend/.env`:

```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://financeflow:financeflow_password@localhost:5432/financeflow_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key
CLIENT_URL=http://localhost:3000
```

#### Frontend (.env.local)

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME=FinanceFlow
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev

# Or from root directory
npm run dev
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests with coverage
cd backend
npm run test:ci

# Frontend tests
cd frontend
npm run test:ci

# E2E tests
npm run test:e2e
```

## 📊 Database Management

```bash
# Open Prisma Studio (visual database editor)
cd backend
npm run db:studio

# Create a new migration
npm run db:migrate

# Reset database (WARNING: deletes all data)
npm run db:reset

# Seed database
npm run db:seed
```

## 🔧 Common Issues

### Port already in use

```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 5000 (backend)
lsof -ti:5000 | xargs kill -9
```

### Database connection issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Check database logs
docker logs financeflow-postgres

# Restart database
docker restart financeflow-postgres
```

### Redis connection issues

```bash
# Check if Redis is running
docker ps | grep redis

# Test Redis connection
redis-cli ping  # Should return PONG

# Restart Redis
docker restart financeflow-redis
```

## 🚢 Production Deployment

### Using Docker

```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
```

### Environment Variables

Update these for production:

- `JWT_SECRET` - Use a strong random string (32+ characters)
- `JWT_REFRESH_SECRET` - Different from JWT_SECRET
- `ENCRYPTION_KEY` - 32 character encryption key
- `DATABASE_URL` - Production database connection string
- `REDIS_URL` - Production Redis connection string

### Database Migrations

```bash
# Apply pending migrations
npm run db:migrate:prod

# Check migration status
npx prisma migrate status
```

## 📚 Additional Resources

- [API Documentation](./docs/api/README.md)
- [Architecture Guide](./docs/architecture/README.md)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Deployment Guide](./docs/deployment/README.md)

## 🆘 Support

- GitHub Issues: https://github.com/yourusername/financeflow/issues
- Documentation: https://docs.financeflow.com
- Discord: https://discord.gg/financeflow
