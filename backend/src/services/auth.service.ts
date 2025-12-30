import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { PasswordUtil } from '@/utils/password';
import { JwtUtil } from '@/utils/jwt';
import { AppError } from '@/middleware/errorHandler';
import { User } from '@prisma/client';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface AuthResponse {
  user: Omit<User, 'passwordHash' | 'twoFactorSecret'>;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterData): Promise<AuthResponse> {
    const { email, password, firstName, lastName } = data;

    // Validate password
    const passwordValidation = PasswordUtil.validate(password);
    if (!passwordValidation.valid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      throw new AppError(409, 'User with this email already exists');
    }

    // Hash password
    const passwordHash = await PasswordUtil.hash(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
      },
    });

    // Generate tokens
    const payload = { userId: user.id, email: user.email };
    const accessToken = JwtUtil.generateAccessToken(payload);
    const refreshToken = JwtUtil.generateRefreshToken(payload);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Remove sensitive data
    const { passwordHash: _, twoFactorSecret: __, ...userWithoutSensitiveData } = user;

    return {
      user: userWithoutSensitiveData,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Login user
   */
  static async login(data: LoginData): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const isValidPassword = await PasswordUtil.verify(user.passwordHash, password);
    if (!isValidPassword) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate tokens
    const payload = { userId: user.id, email: user.email };
    const accessToken = JwtUtil.generateAccessToken(payload);
    const refreshToken = JwtUtil.generateRefreshToken(payload);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Remove sensitive data
    const { passwordHash: _, twoFactorSecret: __, ...userWithoutSensitiveData } = user;

    return {
      user: userWithoutSensitiveData,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const payload = JwtUtil.verifyRefreshToken(refreshToken);

      // Check if refresh token exists in database
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: {
            gt: new Date(),
          },
        },
      });

      if (!storedToken) {
        throw new AppError(401, 'Invalid or expired refresh token');
      }

      // Generate new access token
      const accessToken = JwtUtil.generateAccessToken({
        userId: payload.userId,
        email: payload.email,
      });

      return { accessToken };
    } catch (error) {
      throw new AppError(401, 'Invalid or expired refresh token');
    }
  }

  /**
   * Logout user
   */
  static async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Delete specific refresh token
      await prisma.refreshToken.deleteMany({
        where: {
          userId,
          token: refreshToken,
        },
      });
    } else {
      // Delete all refresh tokens for user
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<Omit<User, 'passwordHash' | 'twoFactorSecret'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    const { passwordHash: _, twoFactorSecret: __, ...userWithoutSensitiveData } = user;
    return userWithoutSensitiveData;
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'avatarUrl'>>
  ): Promise<Omit<User, 'passwordHash' | 'twoFactorSecret'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    const { passwordHash: _, twoFactorSecret: __, ...userWithoutSensitiveData } = user;
    return userWithoutSensitiveData;
  }

  /**
   * Change password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.passwordHash) {
      throw new AppError(404, 'User not found');
    }

    // Verify current password
    const isValidPassword = await PasswordUtil.verify(user.passwordHash, currentPassword);
    if (!isValidPassword) {
      throw new AppError(401, 'Current password is incorrect');
    }

    // Validate new password
    const passwordValidation = PasswordUtil.validate(newPassword);
    if (!passwordValidation.valid) {
      throw new AppError(400, passwordValidation.errors.join(', '));
    }

    // Hash new password
    const passwordHash = await PasswordUtil.hash(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Delete all refresh tokens (force re-login)
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
}

export default AuthService;
