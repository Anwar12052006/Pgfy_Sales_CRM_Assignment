import { Router } from 'express';
import { Role } from '../config/prisma.js';
import { leadController } from '../controllers/lead.controller.js';
import { callController } from '../controllers/call.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validateBody } from '../middleware/validate.js';
import {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  assignLeadSchema,
} from '../validators/lead.validator.js';

export const leadRouter = Router();

// All lead management endpoints require authenticated session
leadRouter.use(authenticate);

// 1. GET /api/leads - List leads (Admin sees all / filtered; Executive sees only assigned)
leadRouter.get('/', leadController.getAll);

// 2. POST /api/leads - Create lead (Admin only)
leadRouter.post(
  '/',
  authorize(Role.ADMIN),
  validateBody(createLeadSchema),
  leadController.create
);

// 3. GET /api/leads/:id - View single lead (Admin or assigned Executive)
leadRouter.get('/:id', leadController.getById);

// 4. PUT /api/leads/:id - Edit general lead information (Admin only)
leadRouter.put(
  '/:id',
  authorize(Role.ADMIN),
  validateBody(updateLeadSchema),
  leadController.update
);

// 5. PATCH /api/leads/:id/status - Update lead status (Admin or assigned Executive)
leadRouter.patch(
  '/:id/status',
  validateBody(updateLeadStatusSchema),
  leadController.updateStatus
);

// 6. PATCH /api/leads/:id/assign - Assign or reassign lead to executive (Admin only)
leadRouter.patch(
  '/:id/assign',
  authorize(Role.ADMIN),
  validateBody(assignLeadSchema),
  leadController.assign
);

// 7. GET /api/leads/:id/assignments - View assignment history (Admin only)
leadRouter.get(
  '/:id/assignments',
  authorize(Role.ADMIN),
  leadController.getAssignments
);

// 8. GET /api/leads/:id/calls - View call history for a specific lead
leadRouter.get(
  '/:id/calls',
  callController.getByLeadId
);
