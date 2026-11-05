import { Router } from 'express';
import { followUpController } from '../controllers/followup.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import {
  createFollowUpSchema,
  updateFollowUpStatusSchema,
  rescheduleFollowUpSchema,
} from '../validators/followup.validator.js';

export const followUpRouter = Router();

// All follow-up endpoints require authenticated session
followUpRouter.use(authenticate);

// 1. POST /api/followups - Schedule a follow-up task
followUpRouter.post(
  '/',
  validateBody(createFollowUpSchema),
  followUpController.create
);

// 2. GET /api/followups - List follow-up tasks with classification filters
followUpRouter.get('/', followUpController.getAll);

// 3. GET /api/followups/:id - View single follow-up detail
followUpRouter.get('/:id', followUpController.getById);

// 4. PATCH /api/followups/:id/status - Mark follow-up as COMPLETED or CANCELLED
followUpRouter.patch(
  '/:id/status',
  validateBody(updateFollowUpStatusSchema),
  followUpController.updateStatus
);

// 5. PATCH /api/followups/:id/reschedule - Reschedule an existing pending follow-up
followUpRouter.patch(
  '/:id/reschedule',
  validateBody(rescheduleFollowUpSchema),
  followUpController.reschedule
);
