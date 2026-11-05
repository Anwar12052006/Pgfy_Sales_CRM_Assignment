import { Router } from 'express';

import { authController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { loginSchema } from '../validators/auth.validator.js';

export const authRouter = Router();

// Public route: POST /api/auth/login
authRouter.post('/login', validateBody(loginSchema), authController.login);

// Protected route: GET /api/auth/me
authRouter.get('/me', authenticate, authController.getMe);

// Protected route: POST /api/auth/logout
authRouter.post('/logout', authenticate, authController.logout);
