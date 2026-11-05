import { Router } from 'express';

import { adminRouter } from './admin.routes.js';
import { authRouter } from './auth.routes.js';
import { callRouter } from './call.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import { executiveRouter } from './executive.routes.js';
import { followUpRouter } from './followup.routes.js';
import { leadRouter } from './lead.routes.js';
import { reportRouter } from './report.routes.js';
import { userRouter } from './user.routes.js';

export const apiRouter = Router();

// Mount API sub-routers
apiRouter.use('/auth', authRouter);
apiRouter.use('/calls', callRouter);
apiRouter.use('/followups', followUpRouter);
apiRouter.use('/follow-ups', followUpRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/executive', executiveRouter);
apiRouter.use('/leads', leadRouter);
apiRouter.use('/users', userRouter);
