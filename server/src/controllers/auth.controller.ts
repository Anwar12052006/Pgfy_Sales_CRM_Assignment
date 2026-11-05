import type { Request, Response } from 'express';
import { authService } from '../services/auth.service.js';
import { asyncHandler } from '../utils/index.js';

export class AuthController {
  /**
   * POST /api/auth/login
   */
  public login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  /**
   * GET /api/auth/me
   */
  public getMe = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // req.user is guaranteed by authenticate middleware
    const user = await authService.getProfile(req.user!.id);

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: user,
    });
  });

  /**
   * POST /api/auth/logout
   */
  public logout = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  });
}

export const authController = new AuthController();
