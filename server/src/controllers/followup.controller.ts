import type { Request, Response } from 'express';
import { followUpService } from '../services/followup.service.js';
import { asyncHandler } from '../utils/index.js';
import {
  queryFollowUpsSchema,
  updateFollowUpStatusSchema,
  rescheduleFollowUpSchema,
} from '../validators/followup.validator.js';

export class FollowUpController {
  /**
   * POST /api/followups
   * Schedule a new follow-up task.
   */
  public create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const followUp = await followUpService.createFollowUp(req.body, req.user!);

    res.status(201).json({
      success: true,
      message: 'Follow-up scheduled successfully',
      data: followUp,
    });
  });

  /**
   * GET /api/followups
   * Query follow-up tasks (Admin: all/filtered; Executive: own tasks).
   * Supports classification filters: today, upcoming, overdue, completed, cancelled.
   */
  public getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsedQuery = queryFollowUpsSchema.parse(req.query);
    const result = await followUpService.getFollowUps(parsedQuery, req.user!);

    res.status(200).json({
      success: true,
      message: 'Follow-up tasks retrieved successfully',
      data: result.followUps,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/followups/:id
   * View details of an individual follow-up task.
   */
  public getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const followUpId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const followUp = await followUpService.getFollowUpById(followUpId, req.user!);

    res.status(200).json({
      success: true,
      message: 'Follow-up details retrieved successfully',
      data: followUp,
    });
  });

  /**
   * PATCH /api/followups/:id/status
   * Mark follow-up as COMPLETED or CANCELLED.
   */
  public updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const followUpId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const parsedBody = updateFollowUpStatusSchema.parse(req.body);
    const updated = await followUpService.updateStatus(followUpId, parsedBody, req.user!);

    res.status(200).json({
      success: true,
      message: `Follow-up marked as ${updated.status} successfully`,
      data: updated,
    });
  });

  /**
   * PATCH /api/followups/:id/reschedule
   * Reschedule an existing pending follow-up to a new dueAt date.
   */
  public reschedule = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const followUpId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const parsedBody = rescheduleFollowUpSchema.parse(req.body);
    const rescheduled = await followUpService.rescheduleFollowUp(followUpId, parsedBody, req.user!);

    res.status(200).json({
      success: true,
      message: 'Follow-up rescheduled successfully',
      data: rescheduled,
    });
  });
}

export const followUpController = new FollowUpController();
