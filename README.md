# FinanceFlow - Personal Finance Tracker

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Node](https://img.shields.io/badge/node-18%2B-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org)

A modern, full-stack personal finance management application built with Next.js 14, Express.js, PostgreSQL, and Redis. Track expenses, manage budgets, and gain insights into your spending patterns.

## MVP Features Implemented

### Authentication & Security
- JWT-based authentication with access and refresh tokens
- Secure password hashing with Argon2
- OAuth 2.0 support (Google, GitHub) ready
- Rate limiting and CORS protection

### Transaction Management
- Create, read, update, delete transactions
- Categorize transactions with system and custom categories
- Filter and search transactions
- Support for income, expenses, and transfers
- Tax-deductible expense tracking

### Budget Tracking
- Create monthly, weekly, yearly budgets
- Real-time budget progress tracking
- Budget alerts at configurable thresholds
- Category-based budget allocation

### Analytics & Insights
- Dashboard with key financial metrics
- Spending breakdown by category
- Month-over-month comparison
- Savings rate calculation
- Monthly and yearly summaries

## Planned Features
- Bank Integration (Plaid API)
- Receipt Scanning (OCR)
- Predictive Analytics
- Bill Reminders
- Investment Tracking
- Multi-Currency Support

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────────┤
│                      API Gateway (Express)                   │
├─────────────────────────────────────────────────────────────┤
│  Auth Service │ Transaction │ Analytics │ Integration        │
│               │   Service   │  Service  │   Service          │
├─────────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                       │
├─────────────────────────────────────────────────────────────┤
│                    Redis Cache Layer                         │
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
financeflow/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # App router pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utilities and helpers
│   │   ├── services/        # API client services
│   │   └── styles/          # Global styles
│   └── public/              # Static assets
│
├── backend/                  # Express.js API
│   ├── src/
│   │   ├── api/             # Route handlers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Database models
│   │   ├── middleware/      # Express middleware
│   │   ├── utils/           # Helper functions
│   │   └── config/          # Configuration
│   └── tests/               # Test suites
│
├── database/                 # Database schemas
│   ├── migrations/          # Schema migrations
│   ├── seeds/               # Sample data
│   └── scripts/             # DB utilities
│
├── shared/                   # Shared types/constants
│   ├── types/               # TypeScript types
│   └── constants/           # Shared constants
│
├── infrastructure/           # Deployment configs
│   ├── docker/              # Docker configurations
│   ├── kubernetes/          # K8s manifests
│   └── terraform/           # Infrastructure as code
│
└── docs/                     # Documentation
    ├── api/                 # API documentation
    ├── architecture/        # System design docs
    └── deployment/          # Deployment guides
```

## Quick Start

### Option 1: Docker (Recommended)

```bash
git clone https://github.com/DroidRobot/Personal-Finance-Tracker.git
cd Personal-Finance-Tracker

# Start all services
docker-compose up

# Run migrations and seed data
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npm run db:seed
```

**Demo Login:** `demo@financeflow.com` / `Demo123!@#`

### Option 2: Manual Setup

See [SETUP.md](./SETUP.md) for detailed instructions.

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis 6+

**Old Installation Steps (if needed)**

```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd frontend && npm install

# Install backend dependencies
cd ../backend && npm install
```

3. **Set up environment variables**
```bash
# Copy example env files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# Edit with your credentials
# Required: Database URL, JWT secret, Plaid keys
```

4. **Initialize database**
```bash
cd backend
npm run db:migrate
npm run db:seed  # Optional: Load sample data
```

5. **Start development servers**
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

Access the application at `http://localhost:3000`

## Testing

```bash
# Run all tests
npm run test

# Backend tests with coverage
cd backend && npm run test:coverage

# Frontend tests
cd frontend && npm run test

# E2E tests
npm run test:e2e
```

## Performance Metrics

- **Page Load**: < 1.5s (LCP)
- **API Response**: < 200ms (p95)
- **Test Coverage**: > 85%
- **Lighthouse Score**: > 95

## Security Features

- JWT-based authentication with refresh tokens
- OAuth 2.0 social login (Google, GitHub)
- Two-factor authentication (TOTP)
- End-to-end encryption for sensitive data
- Rate limiting and DDoS protection
- SQL injection prevention
- XSS and CSRF protection

## Deployment

### Docker Deployment
```bash
docker-compose up --build
```

### Production Deployment (AWS)
```bash
# Using provided Terraform configs
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

## Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **UI Library**: React 18
- **Styling**: Tailwind CSS + CSS Modules
- **State Management**: Zustand
- **Data Fetching**: TanStack Query
- **Charts**: Recharts + D3.js
- **Forms**: React Hook Form + Zod
- **Testing**: Jest + React Testing Library

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Queue**: Bull (Redis-based)
- **Authentication**: Passport.js
- **Validation**: Joi
- **Testing**: Jest + Supertest

### Infrastructure
- **Container**: Docker
- **Orchestration**: Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack

## API Documentation

Interactive API documentation available at `/api/docs` when running locally.

Key endpoints:
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/transactions` - List transactions
- `POST /api/transactions` - Create transaction
- `GET /api/budgets` - Get budgets
- `POST /api/analytics/forecast` - Generate spending forecast
- `POST /api/plaid/link` - Initialize Plaid Link

## License

MIT License - see [LICENSE](./LICENSE) for details

## Acknowledgments

- Plaid for banking API
- OpenAI for categorization ML
- Chart.js community for visualization tools

---

**Live Demo**: [financeflow.demo.com](https://financeflow.demo.com)  
**Documentation**: [docs.financeflow.com](https://docs.financeflow.com)

