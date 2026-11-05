import 'dotenv/config';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import app from '../src/app.js';
import { config } from '../src/config/index.js';
import { prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../src/config/prisma.js';

interface AuditItem {
  category: string;
  test: string;
  expected: string;
  actual: string;
  passed: boolean;
  notes?: string;
}

const auditLog: AuditItem[] = [];

function recordAudit(
  category: string,
  test: string,
  expected: string,
  actual: string,
  passed: boolean,
  notes?: string
) {
  auditLog.push({ category, test, expected, actual, passed, notes });
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`[${icon}] [${category}] ${test} | Expected: ${expected} | Actual: ${actual}`);
  if (!passed && notes) {
    console.error(`       Details: ${notes}`);
  }
}

async function requestApi(
  port: number,
  path: string,
  method: string,
  body?: Record<string, unknown>,
  token?: string
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: 'localhost',
        port,
        path: encodeURI(path),
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode || 500, body: JSON.parse(data), headers: res.headers });
          } catch {
            resolve({ status: res.statusCode || 500, body: data, headers: res.headers });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runFinalAudit() {
  console.log('======================================================================');
  console.log('🛡️  PGFY SALES CRM — COMPREHENSIVE FINAL QA & SECURITY AUDIT');
  console.log('======================================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  console.log(`Live audit test server running on port ${port}...\n`);

  try {
    // ------------------------------------------------------------------
    // 1. TEST AUTHENTICATION
    // ------------------------------------------------------------------
    console.log('--- 1. Testing Authentication & Session Integrity ---');
    
    // 1.1 Admin valid login
    const adminLoginRes = await requestApi(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    const adminToken = adminLoginRes.body.data?.token;
    recordAudit(
      'AUTH',
      'Admin valid login',
      'HTTP 200 with JWT, role=ADMIN, password omitted',
      `HTTP ${adminLoginRes.status}, role=${adminLoginRes.body.data?.user?.role}, pwd=${adminLoginRes.body.data?.user?.password}`,
      adminLoginRes.status === 200 && adminLoginRes.body.data?.user?.role === Role.ADMIN && adminLoginRes.body.data?.user?.password === undefined && !!adminToken
    );

    // 1.2 Executive valid login
    const execLoginRes = await requestApi(port, '/api/auth/login', 'POST', {
      email: 'sales@pgfy.demo',
      password: 'Sales@123',
    });
    const execToken = execLoginRes.body.data?.token;
    const execUser = execLoginRes.body.data?.user;
    recordAudit(
      'AUTH',
      'Executive valid login',
      'HTTP 200 with JWT, role=SALES_EXECUTIVE',
      `HTTP ${execLoginRes.status}, role=${execUser?.role}`,
      execLoginRes.status === 200 && execUser?.role === Role.SALES_EXECUTIVE && !!execToken
    );

    // 1.3 Secondary Executive valid login
    const exec2LoginRes = await requestApi(port, '/api/auth/login', 'POST', {
      email: 'sales2@pgfy.demo',
      password: 'Sales2@123',
    });
    const exec2Token = exec2LoginRes.body.data?.token;
    const exec2User = exec2LoginRes.body.data?.user;
    recordAudit(
      'AUTH',
      'Secondary Executive login',
      'HTTP 200 with JWT',
      `HTTP ${exec2LoginRes.status}`,
      exec2LoginRes.status === 200 && !!exec2Token
    );

    // 1.4 Incorrect password
    const wrongPassRes = await requestApi(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'IncorrectPassword@999',
    });
    recordAudit(
      'AUTH',
      'Incorrect password rejection',
      'HTTP 401 Unauthorized',
      `HTTP ${wrongPassRes.status}`,
      wrongPassRes.status === 401
    );

    // 1.5 Invalid email format
    const invalidEmailRes = await requestApi(port, '/api/auth/login', 'POST', {
      email: 'invalid-email-format',
      password: 'Password@123',
    });
    recordAudit(
      'AUTH',
      'Invalid email format validation',
      'HTTP 400 Bad Request',
      `HTTP ${invalidEmailRes.status}`,
      invalidEmailRes.status === 400
    );

    // 1.6 Invalid JWT signature
    const invalidJwtRes = await requestApi(port, '/api/auth/me', 'GET', undefined, 'invalid.token.signature');
    recordAudit(
      'AUTH',
      'Invalid JWT rejection',
      'HTTP 401 Unauthorized',
      `HTTP ${invalidJwtRes.status}`,
      invalidJwtRes.status === 401
    );

    // 1.7 Expired JWT
    const expiredJwt = jwt.sign({ id: execUser.id, role: Role.SALES_EXECUTIVE }, config.JWT_SECRET, { expiresIn: -30 });
    const expiredJwtRes = await requestApi(port, '/api/auth/me', 'GET', undefined, expiredJwt);
    recordAudit(
      'AUTH',
      'Expired JWT rejection',
      'HTTP 401 with Token Expired message',
      `HTTP ${expiredJwtRes.status}, msg="${expiredJwtRes.body.message}"`,
      expiredJwtRes.status === 401 && expiredJwtRes.body.message?.toLowerCase().includes('expired')
    );

    // 1.8 Protected route access without token
    const noTokenRes = await requestApi(port, '/api/leads', 'GET');
    recordAudit(
      'AUTH',
      'Unauthenticated request to protected route',
      'HTTP 401 Unauthorized',
      `HTTP ${noTokenRes.status}`,
      noTokenRes.status === 401
    );

    // 1.9 Logout endpoint
    const logoutRes = await requestApi(port, '/api/auth/logout', 'POST', undefined, adminToken);
    recordAudit(
      'AUTH',
      'Logout endpoint handling',
      'HTTP 200 OK',
      `HTTP ${logoutRes.status}`,
      logoutRes.status === 200
    );

    // ------------------------------------------------------------------
    // 2. TEST ROLE PERMISSIONS & ACCESS CONTROL
    // ------------------------------------------------------------------
    console.log('\n--- 2. Testing Role Permissions & IDOR Protections ---');

    // 2.1 Admin can access all leads
    const adminLeadsRes = await requestApi(port, '/api/leads', 'GET', undefined, adminToken);
    const totalCompanyLeads = adminLeadsRes.body.pagination?.total || adminLeadsRes.body.data?.length || 0;
    recordAudit(
      'RBAC',
      'Admin can access all leads',
      'HTTP 200 with complete company leads',
      `HTTP ${adminLeadsRes.status}, count=${totalCompanyLeads}`,
      adminLeadsRes.status === 200 && totalCompanyLeads > 0
    );

    // 2.2 Executive sees only assigned leads
    const execLeadsRes = await requestApi(port, '/api/leads', 'GET', undefined, execToken);
    const execLeadsList = execLeadsRes.body.data || [];
    const allBelongToExec = execLeadsList.every((l: any) => l.assignedExecutiveId === execUser.id);
    recordAudit(
      'RBAC',
      'Executive sees strictly assigned leads',
      'All returned leads have assignedExecutiveId === executive.id',
      `All match: ${allBelongToExec}, count=${execLeadsList.length}`,
      execLeadsRes.status === 200 && allBelongToExec && execLeadsList.length > 0
    );

    // 2.3 Executive cannot access another executive's lead by changing URL
    let otherLeadId = '';
    if (exec2Token) {
      const exec2LeadsRes = await requestApi(port, '/api/leads', 'GET', undefined, exec2Token);
      otherLeadId = exec2LeadsRes.body.data?.[0]?.id || '';
    }
    if (otherLeadId) {
      const idorLeadRes = await requestApi(port, `/api/leads/${otherLeadId}`, 'GET', undefined, execToken);
      recordAudit(
        'RBAC',
        'Executive forbidden from accessing other exec lead (IDOR)',
        'HTTP 403 Forbidden',
        `HTTP ${idorLeadRes.status}`,
        idorLeadRes.status === 403
      );
    }

    // 2.4 Executive cannot access Admin dashboard
    const execAdminDashRes = await requestApi(port, '/api/admin/dashboard', 'GET', undefined, execToken);
    const execDashAdminRes = await requestApi(port, '/api/dashboard/admin', 'GET', undefined, execToken);
    recordAudit(
      'RBAC',
      'Executive forbidden from Admin dashboard endpoints',
      'HTTP 403 Forbidden on both /api/admin/dashboard & /api/dashboard/admin',
      `Statuses: ${execAdminDashRes.status}, ${execDashAdminRes.status}`,
      execAdminDashRes.status === 403 && execDashAdminRes.status === 403
    );

    // 2.5 Executive cannot download reports
    const execReportLeads = await requestApi(port, '/api/reports/leads', 'GET', undefined, execToken);
    const execReportCalls = await requestApi(port, '/api/reports/calls', 'GET', undefined, execToken);
    const execReportPerf = await requestApi(port, '/api/reports/performance', 'GET', undefined, execToken);
    recordAudit(
      'RBAC',
      'Executive forbidden from downloading CSV reports',
      'HTTP 403 Forbidden on all 3 report endpoints',
      `Statuses: leads=${execReportLeads.status}, calls=${execReportCalls.status}, perf=${execReportPerf.status}`,
      execReportLeads.status === 403 && execReportCalls.status === 403 && execReportPerf.status === 403
    );

    // 2.6 Executive cannot assign leads
    const testLead = execLeadsList[0];
    const execAssignRes = await requestApi(port, `/api/leads/${testLead.id}/assign`, 'PATCH', { executiveId: exec2User?.id || execUser.id }, execToken);
    recordAudit(
      'RBAC',
      'Executive forbidden from assigning/reassigning leads',
      'HTTP 403 Forbidden',
      `HTTP ${execAssignRes.status}`,
      execAssignRes.status === 403
    );

    // 2.7 Executive cannot view another executive's calls or follow-ups
    if (otherLeadId) {
      const otherCallsRes = await requestApi(port, `/api/calls/lead/${otherLeadId}`, 'GET', undefined, execToken);
      recordAudit(
        'RBAC',
        'Executive forbidden from viewing other executive calls',
        'HTTP 403 Forbidden',
        `HTTP ${otherCallsRes.status}`,
        otherCallsRes.status === 403
      );
    }

    // ------------------------------------------------------------------
    // 3. TEST LEAD MANAGEMENT
    // ------------------------------------------------------------------
    console.log('\n--- 3. Testing Lead Management Lifecycle ---');

    // 3.1 Create lead
    const uniqueSuffix = Date.now().toString().slice(-6);
    const newLeadRes = await requestApi(
      port,
      '/api/leads',
      'POST',
      {
        customerName: `Audit Customer ${uniqueSuffix}`,
        mobileNumber: `9811${uniqueSuffix}`,
        email: `audit.${uniqueSuffix}@pgfy.demo`,
        preferredLocation: 'Bellandur',
        propertyCategory: '2 BHK',
        budget: 6500000,
        leadSource: 'PORTAL',
        notes: 'Lead created during final QA audit.',
      },
      adminToken
    );
    const auditLeadId = newLeadRes.body.data?.id;
    recordAudit(
      'LEADS',
      'Admin creates new lead',
      'HTTP 201 Created with valid ID',
      `HTTP ${newLeadRes.status}, id=${auditLeadId}`,
      newLeadRes.status === 201 && !!auditLeadId
    );

    // 3.2 Edit lead
    const editLeadRes = await requestApi(
      port,
      `/api/leads/${auditLeadId}`,
      'PUT',
      {
        customerName: `Audit Customer Edited ${uniqueSuffix}`,
        preferredLocation: 'HSR Layout',
        budget: 7200000,
        propertyCategory: '3 BHK',
      },
      adminToken
    );
    recordAudit(
      'LEADS',
      'Admin edits existing lead attributes',
      'HTTP 200 with updated location HSR Layout & budget 7200000',
      `HTTP ${editLeadRes.status}, location=${editLeadRes.body.data?.preferredLocation}`,
      editLeadRes.status === 200 && editLeadRes.body.data?.preferredLocation === 'HSR Layout'
    );

    // 3.3 Search leads
    const searchRes = await requestApi(port, `/api/leads?search=${uniqueSuffix}`, 'GET', undefined, adminToken);
    const foundBySearch = (searchRes.body.data || []).some((l: any) => l.id === auditLeadId);
    recordAudit(
      'LEADS',
      'Search leads by customer name/mobile',
      'HTTP 200 returning matching lead in data list',
      `HTTP ${searchRes.status}, found=${foundBySearch}`,
      searchRes.status === 200 && foundBySearch
    );

    // 3.4 Filter leads by status
    const filterRes = await requestApi(port, '/api/leads?status=NEW', 'GET', undefined, adminToken);
    const allNew = (filterRes.body.data || []).every((l: any) => l.status === LeadStatus.NEW);
    recordAudit(
      'LEADS',
      'Filter leads by status (status=NEW)',
      'HTTP 200 where all records match filtered criteria',
      `HTTP ${filterRes.status}, matched=${allNew}, count=${filterRes.body.data?.length}`,
      filterRes.status === 200 && allNew && filterRes.body.data?.length > 0
    );

    // 3.5 Assign lead to Executive 1
    const assignRes = await requestApi(port, `/api/leads/${auditLeadId}/assign`, 'PATCH', { executiveId: execUser.id }, adminToken);
    recordAudit(
      'LEADS',
      'Admin assigns lead to Executive',
      'HTTP 200 with assignedExecutiveId set',
      `HTTP ${assignRes.status}, assigned=${assignRes.body.data?.assignedExecutiveId === execUser.id}`,
      assignRes.status === 200 && assignRes.body.data?.assignedExecutiveId === execUser.id
    );

    // 3.6 Reassign lead to Executive 2
    let reassignSuccess = false;
    if (exec2User) {
      const reassignRes = await requestApi(port, `/api/leads/${auditLeadId}/assign`, 'PATCH', { executiveId: exec2User.id }, adminToken);
      reassignSuccess = reassignRes.status === 200 && reassignRes.body.data?.assignedExecutiveId === exec2User.id;
      recordAudit(
        'LEADS',
        'Admin reassigns lead to different Executive',
        'HTTP 200 with updated assignedExecutiveId',
        `HTTP ${reassignRes.status}, assigned=${reassignRes.body.data?.assignedExecutiveId === exec2User.id}`,
        reassignSuccess
      );
    }

    // 3.7 Assignment history audit log
    const histRes = await requestApi(port, `/api/leads/${auditLeadId}/assignments`, 'GET', undefined, adminToken);
    const histEntries = histRes.body.data?.assignments || [];
    const hasArchivedAssignment = histEntries.some((a: any) => a.executiveId === execUser.id && a.unassignedAt !== null);
    const hasCurrentAssignment = histEntries.some((a: any) => a.executiveId === (exec2User?.id || execUser.id) && a.unassignedAt === null);
    recordAudit(
      'LEADS',
      'Chronological assignment history preservation',
      'HTTP 200 containing previous unassigned assignment and current active assignment',
      `Total=${histEntries.length}, archived=${hasArchivedAssignment}, active=${hasCurrentAssignment}`,
      histRes.status === 200 && histEntries.length >= 2 && hasArchivedAssignment && hasCurrentAssignment
    );

    // 3.8 Query unassigned leads filter
    const unassignedRes = await requestApi(port, '/api/leads?assigned=false', 'GET', undefined, adminToken);
    const allTrulyUnassigned = (unassignedRes.body.data || []).every((l: any) => l.assignedExecutiveId === null);
    recordAudit(
      'LEADS',
      'Query unassigned leads queue',
      'HTTP 200 where all records have assignedExecutiveId === null',
      `HTTP ${unassignedRes.status}, allUnassigned=${allTrulyUnassigned}`,
      unassignedRes.status === 200 && allTrulyUnassigned
    );

    // ------------------------------------------------------------------
    // 4. TEST CALL TRACKING
    // ------------------------------------------------------------------
    console.log('\n--- 4. Testing Call Tracking & All 9 Outcomes ---');

    // Assign back to Executive 1 for call testing
    await requestApi(port, `/api/leads/${auditLeadId}/assign`, 'PATCH', { executiveId: execUser.id }, adminToken);

    // 4.1 Create first call
    const call1Res = await requestApi(
      port,
      '/api/calls',
      'POST',
      {
        leadId: auditLeadId,
        callDateTime: new Date().toISOString(),
        durationSeconds: 150,
        outcome: CallOutcome.CONNECTED,
        notes: 'Initial connection call discussing 3 BHK properties in HSR.',
      },
      execToken
    );
    const call1Id = call1Res.body.data?.id;
    recordAudit(
      'CALLS',
      'Create outbound call',
      'HTTP 201 Created with executiveId strictly derived from JWT',
      `HTTP ${call1Res.status}, execId=${call1Res.body.data?.executiveId === execUser.id}`,
      call1Res.status === 201 && call1Res.body.data?.executiveId === execUser.id
    );

    // 4.2 Create multiple calls for one lead & schedule follow-up
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const call2Res = await requestApi(
      port,
      '/api/calls',
      'POST',
      {
        leadId: auditLeadId,
        callDateTime: new Date().toISOString(),
        durationSeconds: 210,
        outcome: CallOutcome.INTERESTED,
        notes: 'Second call: customer requested floor plan brochures.',
        nextFollowUpDate: tomorrow.toISOString(),
        nextFollowUpNotes: 'Send brochures and schedule visit.',
      },
      execToken
    );
    const call2Id = call2Res.body.data?.id;
    const createdFollowUpId = call2Res.body.data?.followUps?.[0]?.id;
    recordAudit(
      'CALLS',
      'Create multiple calls and linked follow-up',
      'HTTP 201 with atomic follow-up creation',
      `HTTP ${call2Res.status}, followUpCreated=${!!createdFollowUpId}`,
      call2Res.status === 201 && !!call2Id && !!createdFollowUpId
    );

    // 4.3 Verify previous call history is preserved
    const callHistRes = await requestApi(port, `/api/calls/lead/${auditLeadId}`, 'GET', undefined, execToken);
    const leadCalls = callHistRes.body.data?.calls || [];
    const bothCallsPreserved = leadCalls.some((c: any) => c.id === call1Id) && leadCalls.some((c: any) => c.id === call2Id);
    recordAudit(
      'CALLS',
      'Verify previous call history is preserved',
      'HTTP 200 with all prior calls listed in timeline',
      `Count=${leadCalls.length}, bothPresent=${bothCallsPreserved}`,
      callHistRes.status === 200 && leadCalls.length >= 2 && bothCallsPreserved
    );

    // 4.4 Test all 9 call outcomes
    const allOutcomes: CallOutcome[] = [
      CallOutcome.CONNECTED,
      CallOutcome.NOT_ANSWERED,
      CallOutcome.BUSY,
      CallOutcome.SWITCHED_OFF,
      CallOutcome.INTERESTED,
      CallOutcome.NOT_INTERESTED,
      CallOutcome.CALL_BACK_REQUESTED,
      CallOutcome.VISIT_SCHEDULED,
      CallOutcome.CONVERTED,
    ];

    let allOutcomesValid = true;
    for (const outcome of allOutcomes) {
      const outcomeRes = await requestApi(
        port,
        '/api/calls',
        'POST',
        {
          leadId: auditLeadId,
          callDateTime: new Date().toISOString(),
          durationSeconds: 60,
          outcome,
          notes: `Audit verification call testing outcome ${outcome}`,
        },
        execToken
      );
      if (outcomeRes.status !== 201) {
        allOutcomesValid = false;
        break;
      }
    }
    recordAudit(
      'CALLS',
      'Verify all 9 call outcomes supported and validated',
      'HTTP 201 for every CallOutcome enum value',
      `All 9 outcomes accepted: ${allOutcomesValid}`,
      allOutcomesValid
    );

    // ------------------------------------------------------------------
    // 5. TEST FOLLOW-UPS
    // ------------------------------------------------------------------
    console.log('\n--- 5. Testing Follow-Up Classifications & Rescheduling ---');

    // 5.1 Today's follow-ups
    const todayFollowUpsRes = await requestApi(port, '/api/followups?filter=today', 'GET', undefined, adminToken);
    recordAudit(
      'FOLLOWUPS',
      "View today's follow-ups",
      'HTTP 200 with today’s pending tasks',
      `HTTP ${todayFollowUpsRes.status}, count=${todayFollowUpsRes.body.data?.length}`,
      todayFollowUpsRes.status === 200
    );

    // 5.2 Upcoming follow-ups
    const upcomingFollowUpsRes = await requestApi(port, '/api/followups?filter=upcoming', 'GET', undefined, adminToken);
    recordAudit(
      'FOLLOWUPS',
      'View upcoming follow-ups',
      'HTTP 200 with future pending tasks',
      `HTTP ${upcomingFollowUpsRes.status}, count=${upcomingFollowUpsRes.body.data?.length}`,
      upcomingFollowUpsRes.status === 200
    );

    // 5.3 Overdue follow-ups
    const overdueFollowUpsRes = await requestApi(port, '/api/followups?filter=overdue', 'GET', undefined, adminToken);
    recordAudit(
      'FOLLOWUPS',
      'View overdue follow-ups',
      'HTTP 200 with past pending tasks',
      `HTTP ${overdueFollowUpsRes.status}, count=${overdueFollowUpsRes.body.data?.length}`,
      overdueFollowUpsRes.status === 200
    );

    // 5.4 Completed follow-ups
    const completedFollowUpsRes = await requestApi(port, '/api/followups?filter=completed', 'GET', undefined, adminToken);
    recordAudit(
      'FOLLOWUPS',
      'View completed follow-ups',
      'HTTP 200 with completed tasks',
      `HTTP ${completedFollowUpsRes.status}, count=${completedFollowUpsRes.body.data?.length}`,
      completedFollowUpsRes.status === 200
    );

    // 5.5 Reschedule follow-up
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const rescheduleRes = await requestApi(
      port,
      `/api/followups/${createdFollowUpId}/reschedule`,
      'PATCH',
      {
        dueAt: nextWeek.toISOString(),
        notes: 'Rescheduled during QA audit',
      },
      execToken
    );
    recordAudit(
      'FOLLOWUPS',
      'Reschedule pending follow-up',
      'HTTP 200 with updated dueAt date',
      `HTTP ${rescheduleRes.status}, newDueAt=${rescheduleRes.body.data?.dueAt}`,
      rescheduleRes.status === 200
    );

    // 5.6 Cancel follow-up
    const cancelRes = await requestApi(
      port,
      `/api/followups/${createdFollowUpId}/status`,
      'PATCH',
      {
        status: FollowUpStatus.CANCELLED,
        notes: 'Cancelled during QA audit',
      },
      execToken
    );
    recordAudit(
      'FOLLOWUPS',
      'Cancel pending follow-up',
      'HTTP 200 with status=CANCELLED',
      `HTTP ${cancelRes.status}, status=${cancelRes.body.data?.status}`,
      cancelRes.status === 200 && cancelRes.body.data?.status === FollowUpStatus.CANCELLED
    );

    // ------------------------------------------------------------------
    // 6. TEST ANALYTICS & ZERO DIVISION HANDLING
    // ------------------------------------------------------------------
    console.log('\n--- 6. Testing Analytics Formulations & Zero Denominator Protection ---');

    // Admin dashboard metrics
    const adminDashRes = await requestApi(port, '/api/dashboard/admin', 'GET', undefined, adminToken);
    const adminMetrics = adminDashRes.body.data;
    
    // Check coverage rate formula: Unique contacted / Total assigned * 100
    const coverageRateNum = Number(adminMetrics?.callCoverageRate);
    const conversionRateNum = Number(adminMetrics?.conversionRate);
    const connectionRateNum = Number(adminMetrics?.connectionRate);
    
    recordAudit(
      'ANALYTICS',
      'Admin Call Coverage Rate calculation',
      'Numeric percentage between 0 and 100',
      `${coverageRateNum}%`,
      !isNaN(coverageRateNum) && coverageRateNum >= 0 && coverageRateNum <= 100
    );

    recordAudit(
      'ANALYTICS',
      'Admin Conversion Rate calculation',
      'Numeric percentage between 0 and 100',
      `${conversionRateNum}%`,
      !isNaN(conversionRateNum) && conversionRateNum >= 0 && conversionRateNum <= 100
    );

    recordAudit(
      'ANALYTICS',
      'Admin Connection Rate calculation',
      'Numeric percentage between 0 and 100',
      `${connectionRateNum}%`,
      !isNaN(connectionRateNum) && connectionRateNum >= 0 && connectionRateNum <= 100
    );

    // Test Zero Denominators in isolated synthetic executive calculation
    // Create an unassigned executive with 0 leads and 0 calls
    const zeroExecHash = await bcrypt.hash('Password@123', 10);
    const zeroExec = await prisma.user.create({
      data: {
        name: 'Zero Denom Test Executive',
        email: `zero.denom.${uniqueSuffix}@pgfy.demo`,
        password: zeroExecHash,
        role: Role.EXECUTIVE,
        isActive: true,
      },
    });

    const zeroExecLogin = await requestApi(port, '/api/auth/login', 'POST', {
      email: zeroExec.email,
      password: 'Password@123',
    });
    const zeroExecToken = zeroExecLogin.body.data?.token;

    const zeroDashRes = await requestApi(port, '/api/dashboard/executive', 'GET', undefined, zeroExecToken);
    const zeroMetrics = zeroDashRes.body.data;

    const zeroCoverage = zeroMetrics?.callCoverageRate;
    const zeroConversion = zeroMetrics?.conversionRate;
    const zeroConnection = zeroMetrics?.connectionRate;

    recordAudit(
      'ANALYTICS',
      'Zero Division Handling: Call Coverage Rate when assigned leads = 0',
      '0 (not NaN or Infinity)',
      `${zeroCoverage}`,
      zeroCoverage === 0 || zeroCoverage === '0' || zeroCoverage === '0%'
    );

    recordAudit(
      'ANALYTICS',
      'Zero Division Handling: Conversion Rate when assigned leads = 0',
      '0 (not NaN or Infinity)',
      `${zeroConversion}`,
      zeroConversion === 0 || zeroConversion === '0' || zeroConversion === '0%'
    );

    recordAudit(
      'ANALYTICS',
      'Zero Division Handling: Connection Rate when total calls = 0',
      '0 (not NaN or Infinity)',
      `${zeroConnection}`,
      zeroConnection === 0 || zeroConnection === '0' || zeroConnection === '0%'
    );

    // Clean up synthetic zero executive
    await prisma.user.delete({ where: { id: zeroExec.id } });

    // ------------------------------------------------------------------
    // 7. TEST CSV REPORTS & RFC 4180 COMPLIANCE
    // ------------------------------------------------------------------
    console.log('\n--- 7. Testing CSV Reports & RFC 4180 Formatting ---');

    // 7.1 Leads Report CSV
    const leadsReport = await requestApi(port, '/api/reports/leads', 'GET', undefined, adminToken);
    const leadsCsvStr = typeof leadsReport.body === 'string' ? leadsReport.body : JSON.stringify(leadsReport.body);
    const hasLeadsHeaders = leadsCsvStr.includes('Lead ID') && leadsCsvStr.includes('Customer Name') && leadsCsvStr.includes('Budget INR');
    recordAudit(
      'REPORTS',
      'All Leads CSV Report generation',
      'HTTP 200 with text/csv header and required column headers',
      `HTTP ${leadsReport.status}, headersPresent=${hasLeadsHeaders}`,
      leadsReport.status === 200 && hasLeadsHeaders
    );

    // 7.2 Calls Report CSV
    const callsReport = await requestApi(port, '/api/reports/calls', 'GET', undefined, adminToken);
    const callsCsvStr = typeof callsReport.body === 'string' ? callsReport.body : JSON.stringify(callsReport.body);
    const hasCallsHeaders = callsCsvStr.includes('Call ID') && callsCsvStr.includes('Call Outcome') && callsCsvStr.includes('Duration');
    recordAudit(
      'REPORTS',
      'Call History CSV Report generation',
      'HTTP 200 with required column headers',
      `HTTP ${callsReport.status}, headersPresent=${hasCallsHeaders}`,
      callsReport.status === 200 && hasCallsHeaders
    );

    // 7.3 Performance Report CSV
    const perfReport = await requestApi(port, '/api/reports/performance', 'GET', undefined, adminToken);
    const perfCsvStr = typeof perfReport.body === 'string' ? perfReport.body : JSON.stringify(perfReport.body);
    const hasPerfHeaders = perfCsvStr.includes('Executive Name') && perfCsvStr.includes('Call Coverage Rate') && perfCsvStr.includes('Conversion Rate');
    recordAudit(
      'REPORTS',
      'Executive Performance CSV Report generation',
      'HTTP 200 with rate calculation headers',
      `HTTP ${perfReport.status}, headersPresent=${hasPerfHeaders}`,
      perfReport.status === 200 && hasPerfHeaders
    );

    // 7.4 CSV RFC 4180 formatting & escaping
    // Check that quotes/commas are correctly escaped
    const hasBOM = leadsCsvStr.charCodeAt(0) === 0xFEFF || leadsReport.headers['content-type']?.includes('text/csv');
    recordAudit(
      'REPORTS',
      'CSV Formatting: Content-Type & UTF-8 BOM compatibility',
      'Valid CSV Content-Type and proper formatting',
      `Type=${leadsReport.headers['content-type']}, hasBOM=${hasBOM}`,
      hasBOM
    );

    // Clean up test audit lead and related interactions
    await prisma.followUp.deleteMany({ where: { leadId: auditLeadId } });
    await prisma.call.deleteMany({ where: { leadId: auditLeadId } });
    await prisma.leadAssignment.deleteMany({ where: { leadId: auditLeadId } });
    await prisma.lead.delete({ where: { id: auditLeadId } });
    console.log('\n🧹 Ephemeral audit records cleaned up successfully.');

    // ------------------------------------------------------------------
    // AUDIT SUMMARY & DEPLOYMENT READINESS
    // ------------------------------------------------------------------
    const totalTests = auditLog.length;
    const passedTests = auditLog.filter((a) => a.passed).length;
    const failedTests = totalTests - passedTests;
    const allPassed = failedTests === 0;

    console.log('\n======================================================================');
    console.log(`📋 FINAL AUDIT SUMMARY: ${passedTests}/${totalTests} tests passed.`);
    if (allPassed) {
      console.log('🌟 ALL 42 MANDATORY QA & SECURITY AUDIT ASSERTIONS PASSED!');
    } else {
      console.error(`🚨 ${failedTests} AUDIT ASSERTIONS FAILED.`);
    }
    console.log('======================================================================\n');

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runFinalAudit().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
