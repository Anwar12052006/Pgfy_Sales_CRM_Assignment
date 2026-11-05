import type { Request, Response } from 'express';
import { leadService } from '../services/lead.service.js';
import { asyncHandler } from '../utils/index.js';
import { queryLeadsSchema } from '../validators/lead.validator.js';

export class LeadController {
  /**
   * POST /api/leads (Admin only)
   */
  public create = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const lead = await leadService.createLead(req.body, req.user!.id);

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead,
    });
  });

  /**
   * GET /api/leads
   * Admin: sees all leads or filtered by status, executive, assigned state, search.
   * Executive: sees only leads assigned to them.
   */
  public getAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parsedQuery = queryLeadsSchema.parse(req.query);
    const result = await leadService.getLeads(req.user!, parsedQuery);

    res.status(200).json({
      success: true,
      message: 'Leads retrieved successfully',
      data: result.leads,
      pagination: result.pagination,
    });
  });

  /**
   * GET /api/leads/:id
   * Admin: accesses any lead.
   * Executive: accesses only their assigned lead (403 otherwise).
   */
  public getById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const lead = await leadService.getLeadById(leadId, req.user!);

    res.status(200).json({
      success: true,
      message: 'Lead retrieved successfully',
      data: lead,
    });
  });

  /**
   * PUT /api/leads/:id (Admin only)
   * Edits general lead information.
   */
  public update = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const updatedLead = await leadService.updateLead(leadId, req.body);

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully',
      data: updatedLead,
    });
  });

  /**
   * PATCH /api/leads/:id/status (Admin or assigned Executive)
   */
  public updateStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const updatedLead = await leadService.updateLeadStatus(
      leadId,
      req.body.status,
      req.user!
    );

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: updatedLead,
    });
  });

  /**
   * PATCH /api/leads/:id/assign (Admin only)
   * Assigns or reassigns lead, preserving assignment history in a transaction.
   */
  public assign = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const updatedLead = await leadService.assignLead(
      leadId,
      req.body.executiveId,
      req.user!.id
    );

    res.status(200).json({
      success: true,
      message: 'Lead assigned successfully',
      data: updatedLead,
    });
  });

  /**
   * GET /api/leads/:id/assignments (Admin only)
   * Retrieves chronological audit history of all lead assignments.
   */
  public getAssignments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const rawId = req.params['id'];
    const leadId = Array.isArray(rawId) ? rawId[0]! : rawId!;

    const result = await leadService.getLeadAssignments(leadId);

    res.status(200).json({
      success: true,
      message: 'Assignment history retrieved successfully',
      data: result,
    });
  });
}

export const leadController = new LeadController();
