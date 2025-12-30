import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';
import passport from 'passport';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import { initializePassport } from './config/passport';
import { metricsMiddleware, register } from './utils/metrics';

// Import routers
import authRouter from './api/auth/auth.router';
import userRouter from './api/users/user.router';
import accountRouter from './api/accounts/account.router';
import transactionRouter from './api/transactions/transaction.router';
import budgetRouter from './api/budgets/budget.router';
import categoryRouter from './api/categories/category.router';
import analyticsRouter from './api/analytics/analytics.router';
import plaidRouter from './api/plaid/plaid.router';
import notificationRouter from './api/notifications/notification.router';

class Server {
  private app: Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.clientUrl,
        credentials: true,
      },
    });
    this.port = config.port;

    this.initializeMiddleware();
    this.initializeAuth();
    this.initializeRoutes();
    this.initializeWebSocket();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: [config.clientUrl],
      credentials: true,
      optionsSuccessStatus: 200,
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // Limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP',
      standardHeaders: true,
      legacyHeaders: false,
    });

    // Stricter limit for auth endpoints
    const authLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 5,
      skipSuccessfulRequests: true,
    });

    this.app.use('/api/auth', authLimiter);
    this.app.use('/api', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Logging
    if (config.env !== 'test') {
      this.app.use(morgan('combined', {
        stream: {
          write: (message) => logger.info(message.trim()),
        },
      }));
    }

    // Metrics
    this.app.use(metricsMiddleware);
  }

  private initializeAuth(): void {
    initializePassport();
    this.app.use(passport.initialize());
  }

  private initializeRoutes(): void {
    // Health check
    this.app.get('/health', async (req, res) => {
      try {
        await prisma.$queryRaw`SELECT 1`;
        await redis.ping();
        res.json({ 
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'connected',
            cache: 'connected',
          }
        });
      } catch (error) {
        res.status(503).json({ 
          status: 'unhealthy',
          error: error.message 
        });
      }
    });

    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    });

    // API routes
    this.app.use('/api/auth', authRouter);
    this.app.use('/api/users', userRouter);
    this.app.use('/api/accounts', accountRouter);
    this.app.use('/api/transactions', transactionRouter);
    this.app.use('/api/budgets', budgetRouter);
    this.app.use('/api/categories', categoryRouter);
    this.app.use('/api/analytics', analyticsRouter);
    this.app.use('/api/plaid', plaidRouter);
    this.app.use('/api/notifications', notificationRouter);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
      });
    });
  }

  private initializeWebSocket(): void {
    this.io.on('connection', (socket) => {
      logger.info(`WebSocket client connected: ${socket.id}`);

      socket.on('authenticate', async (token: string) => {
        try {
          // Verify JWT token
          const userId = await this.verifySocketToken(token);
          if (userId) {
            socket.join(`user:${userId}`);
            socket.emit('authenticated', { userId });
          } else {
            socket.disconnect();
          }
        } catch (error) {
          logger.error('Socket authentication error:', error);
          socket.disconnect();
        }
      });

      socket.on('disconnect', () => {
        logger.info(`WebSocket client disconnected: ${socket.id}`);
      });
    });

    // Make io accessible to other parts of the app
    this.app.set('io', this.io);
  }

  private async verifySocketToken(token: string): Promise<string | null> {
    // Implementation of JWT verification for WebSocket
    // Returns userId if valid, null otherwise
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      return decoded.userId;
    } catch {
      return null;
    }
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (error: Error) => {
      logger.error('Unhandled Promise Rejection:', error);
      this.gracefulShutdown();
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    logger.info('Starting graceful shutdown...');

    // Close server
    this.server.close(() => {
      logger.info('HTTP server closed');
    });

    // Close WebSocket connections
    this.io.close(() => {
      logger.info('WebSocket server closed');
    });

    // Close database connections
    await prisma.$disconnect();
    logger.info('Database connection closed');

    // Close Redis connection
    redis.disconnect();
    logger.info('Redis connection closed');

    process.exit(0);
  }

  public async start(): Promise<void> {
    try {
      // Test database connection
      await prisma.$connect();
      logger.info('Database connected successfully');

      // Test Redis connection
      await redis.ping();
      logger.info('Redis connected successfully');

      // Start server
      this.server.listen(this.port, () => {
        logger.info(`Server running on port ${this.port} in ${config.env} mode`);
        logger.info(`Client URL: ${config.clientUrl}`);
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();
server.start();

export default server;
