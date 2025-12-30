import jwt from 'jsonwebtoken';
import { config } from '@/config';

export interface JwtPayload {
  userId: string;
  email: string;
}

export class JwtUtil {
  /**
   * Generate access token
   */
  static generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  static generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwtRefreshSecret, {
      expiresIn: config.jwtRefreshExpiresIn,
    });
  }

  /**
   * Verify access token
   */
  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload;
  }

  /**
   * Verify refresh token
   */
  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtRefreshSecret) as JwtPayload;
  }

  /**
   * Decode token without verification
   */
  static decode(token: string): JwtPayload | null {
    return jwt.decode(token) as JwtPayload | null;
  }
}

export default JwtUtil;
