import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';

import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { JwtPayload, SafeUser } from '../types/index.js';
import type { LoginInput } from '../validators/auth.validator.js';

export interface LoginResult {
  token: string;
  user: SafeUser;
}

export class AuthService {
  /**
   * Authenticate user with email and password
   */
  public async login(input: LoginInput): Promise<LoginResult> {
    const { email, password } = input;

    // 1. Find user in database
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // 2. Reject inactive accounts
    if (!user.isActive) {
      throw new AppError('Account is deactivated. Please contact an administrator.', 401);
    }

    // 3. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // 4. Generate JWT with configured secret and expiration
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const signOptions: SignOptions = {
      expiresIn: config.JWT_EXPIRES_IN as SignOptions['expiresIn'],
    };

    const token = jwt.sign(payload, config.JWT_SECRET, signOptions);

    // 5. Return sanitized user and JWT token (never return password)
    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { token, user: safeUser };
  }

  /**
   * Retrieve current authenticated user profile
   */
  public async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError('User account not found', 404);
    }

    return user;
  }
}

export const authService = new AuthService();
