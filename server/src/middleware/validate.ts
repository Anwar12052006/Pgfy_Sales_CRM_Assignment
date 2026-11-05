import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodType } from 'zod';

/**
 * Express middleware that validates req.body against a provided Zod schema.
 * Rejects invalid requests with HTTP 400 Bad Request and detailed field messages.
 */
export const validateBody = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};
