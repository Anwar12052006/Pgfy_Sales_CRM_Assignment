import { Router } from 'express';
import { callController } from '../controllers/call.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import { recordCallSchema } from '../validators/call.validator.js';

export const callRouter = Router();

// All call endpoints require authentication
callRouter.use(authenticate);

// 1. POST /api/calls - Record a new call interaction
callRouter.post(
  '/',
  validateBody(recordCallSchema),
  callController.create
);

// 2. GET /api/calls - List calls (Admin sees all/filtered; Executive sees only their own)
callRouter.get('/', callController.getAll);

// 3. GET /api/calls/lead/:leadId - List call history for a specific lead
callRouter.get('/lead/:leadId', callController.getByLeadId);

// 4. GET /api/calls/:id - Get single call detail
callRouter.get('/:id', callController.getById);
