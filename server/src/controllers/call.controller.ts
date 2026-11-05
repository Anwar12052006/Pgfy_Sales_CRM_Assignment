import type { Request, Response } from 'express';
import { callService } from '../services/call.service.js';
import { asyncHandler } from '../utils/index.js';
import { queryCallsSchema } from '../validators/call.validator.js';

export class CallController {
  /**
   * POST /api/calls
   * Record a new call interaction.
   */
  public create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const call = await callService.recordCall(req.body, req.user!);

    res.status(201).json({
      success: true,
      message: 'Call recorded successfully',
      data: call,
    });
  });

  /**
   * GET /api/calls
   * Admin: List all calls or filter by executive, lead, outcome, date range.
   * Executive: List only personal calls.
   */
  public getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsedQuery = queryCallsSchema.parse(req.query);
    const result = await callService.getCalls(parsedQuery, req.user!);

    res.status(200).json({
      success: true,
      message: 'Calls retrieved successfully',
      data: result.calls,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/calls/:id
   * Retrieve a single call record.
   */
  public getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const callId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const call = await callService.getCallById(callId, req.user!);

    res.status(200).json({
      success: true,
      message: 'Call retrieved successfully',
      data: call,
    });
  });

  /**
   * GET /api/calls/lead/:leadId or GET /api/leads/:leadId/calls
   * Retrieve all call records for a given lead.
   */
  public getByLeadId = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['leadId'] || req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const result = await callService.getCallsByLeadId(leadId, req.user!);

    res.status(200).json({
      success: true,
      message: 'Lead call history retrieved successfully',
      data: result,
    });
  });
}

export const callController = new CallController();
