/**
 * Server-side utility functions.
 * Add shared helper functions here.
 */

/**
 * Wraps an async Express route handler to catch rejected promises
 * and forward them to the error-handling middleware.
 */
import type { Request, Response, NextFunction } from 'express';

type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
