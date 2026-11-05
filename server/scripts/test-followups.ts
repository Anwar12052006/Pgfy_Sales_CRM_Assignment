import 'dotenv/config';
import http from 'node:http';
import app from '../src/app.js';
import { prisma, Role, LeadStatus, FollowUpStatus } from '../src/config/prisma.js';
import { getISTDayBoundaries } from '../src/utils/timezone.js';

interface TestResult {
  name: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details?: unknown;
}

const results: TestResult[] = [];

async function makeRequest(
  serverPort: number,
  path: string,
  method: string,
  body?: Record<string, unknown>,
  token?: string
): Promise<{ status: number; body: any }> {
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
        port: serverPort,
        path,
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
            resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode || 500, body: data });
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

function assert(
  name: string,
  expectedStatus: number,
  actualStatus: number,
  condition: boolean = true,
  details?: unknown
) {
  const passed = expectedStatus === actualStatus && condition;
  results.push({ name, expectedStatus, actualStatus, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${actualStatus}] ${name}`);
  if (!passed && details) {
    console.error('   Details:', details);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING PGFY SALES CRM FOLLOW-UP MANAGEMENT SUITE');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5002;

  try {
    // 1. Authenticate users
    const adminLogin = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    const adminToken = adminLogin.body.data.token;

    const exec1Login = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales@pgfy.demo',
      password: 'Sales@123',
    });
    const exec1Token = exec1Login.body.data.token;
    const exec1User = exec1Login.body.data.user;

    const exec2Login = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales2@pgfy.demo',
      password: 'Sales2@123',
    });
    const exec2Token = exec2Login.body.data.token;
    const exec2User = exec2Login.body.data.user;

    // 2. Set up test leads
    const lead1 = await prisma.lead.create({
      data: {
        customerName: 'FollowUp Customer 1 (Exec 1)',
        mobileNumber: '9888111222',
        propertyCategory: '2 BHK',
        preferredLocation: 'HSR Layout',
        budget: 32000,
        leadSource: 'Website',
        status: LeadStatus.INTERESTED,
        assignedExecutiveId: exec1User.id,
      },
    });

    const lead2 = await prisma.lead.create({
      data: {
        customerName: 'FollowUp Customer 2 (Exec 2)',
        mobileNumber: '9888333444',
        propertyCategory: '1 BHK',
        preferredLocation: 'Bellandur',
        budget: 17000,
        leadSource: 'Direct Enquiry',
        status: LeadStatus.CONTACTED,
        assignedExecutiveId: exec2User.id,
      },
    });

    const lead3 = await prisma.lead.create({
      data: {
        customerName: 'FollowUp Customer 3 (Unassigned)',
        mobileNumber: '9888555666',
        propertyCategory: 'Studio Apartment',
        preferredLocation: 'Indiranagar',
        budget: 20000,
        leadSource: 'Facebook',
        status: LeadStatus.NEW,
        assignedExecutiveId: null,
      },
    });

    // ── AUTHENTICATION & VALIDATION TESTS ──────────────────────────

    // Test 1: Unauthenticated request rejected
    const unauthGet = await makeRequest(port, '/api/followups', 'GET');
    assert('1. Unauthenticated request to GET /api/followups rejected with HTTP 401', 401, unauthGet.status);

    const unauthPost = await makeRequest(port, '/api/followups', 'POST', {
      leadId: lead1.id,
      dueAt: new Date().toISOString(),
    });
    assert('2. Unauthenticated request to POST /api/followups rejected with HTTP 401', 401, unauthPost.status);

    // Test 3: Validation rejects missing leadId
    const missingLeadId = await makeRequest(port, '/api/followups', 'POST', {
      dueAt: new Date().toISOString(),
    }, exec1Token);
    assert('3. Validation rejects missing leadId with HTTP 400', 400, missingLeadId.status);

    // Test 4: Validation rejects invalid date format
    const invalidDate = await makeRequest(port, '/api/followups', 'POST', {
      leadId: lead1.id,
      dueAt: 'not-a-valid-date-string',
    }, exec1Token);
    assert('4. Validation rejects invalid date string with HTTP 400', 400, invalidDate.status);

    // ── EXECUTIVE ISOLATION TESTS ON CREATION ─────────────────────

    // Test 5: Executive 1 cannot schedule follow-up on Executive 2's lead
    const crossExecCreate = await makeRequest(port, '/api/followups', 'POST', {
      leadId: lead2.id,
      dueAt: new Date().toISOString(),
      notes: 'Trying to schedule on another executive lead',
    }, exec1Token);
    assert(
      '5. Executive 1 forbidden (HTTP 403) from creating follow-up for Executive 2 lead',
      403,
      crossExecCreate.status
    );

    // Test 6: Executive cannot schedule follow-up on unassigned lead
    const unassignedCreate = await makeRequest(port, '/api/followups', 'POST', {
      leadId: lead3.id,
      dueAt: new Date().toISOString(),
    }, exec1Token);
    assert(
      '6. Executive forbidden (HTTP 403) from creating follow-up for unassigned lead',
      403,
      unassignedCreate.status
    );

    // Test 7: Executive 1 creates follow-up on their assigned lead
    const validCreate = await makeRequest(port, '/api/followups', 'POST', {
      leadId: lead1.id,
      dueAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      notes: 'Initial follow-up call to review lease agreement',
    }, exec1Token);
    assert(
      '7. Executive 1 creates follow-up task (HTTP 201, executiveId bound to JWT)',
      201,
      validCreate.status,
      validCreate.body.data.executiveId === exec1User.id &&
      validCreate.body.data.status === 'PENDING'
    );

    // ── TIMEZONE & CLASSIFICATION TESTS (ASIA/KOLKATA) ─────────────
    const { startOfToday, endOfToday } = getISTDayBoundaries();

    // Setup classified follow-up tasks:
    // A. Overdue task (2 days prior to today in IST)
    const overdueDueAt = new Date(startOfToday.getTime() - 86400000 * 2);
    const overdueTask = await prisma.followUp.create({
      data: {
        leadId: lead1.id,
        executiveId: exec1User.id,
        dueAt: overdueDueAt,
        status: FollowUpStatus.PENDING,
        notes: 'Overdue follow-up from last week',
      },
    });

    // B. Today task (mid-day today in IST)
    const todayDueAt = new Date(startOfToday.getTime() + 1000 * 60 * 60 * 6); // 6 hours into IST day
    const todayTask = await prisma.followUp.create({
      data: {
        leadId: lead1.id,
        executiveId: exec1User.id,
        dueAt: todayDueAt,
        status: FollowUpStatus.PENDING,
        notes: "Today's scheduled site visit",
      },
    });

    // C. Upcoming task (3 days after today in IST)
    const upcomingDueAt = new Date(endOfToday.getTime() + 86400000 * 3);
    const upcomingTask = await prisma.followUp.create({
      data: {
        leadId: lead1.id,
        executiveId: exec1User.id,
        dueAt: upcomingDueAt,
        status: FollowUpStatus.PENDING,
        notes: 'Upcoming check-in next week',
      },
    });

    // D. Exec 2 task (assigned to Exec 2 for isolation testing)
    const exec2Task = await prisma.followUp.create({
      data: {
        leadId: lead2.id,
        executiveId: exec2User.id,
        dueAt: todayDueAt,
        status: FollowUpStatus.PENDING,
        notes: 'Exec 2 personal task',
      },
    });

    // Test 8: Filter by classification=overdue
    const overdueQuery = await makeRequest(port, '/api/followups?classification=overdue', 'GET', undefined, exec1Token);
    const allOverdue = overdueQuery.body.data.every((t: any) => t.classification === 'overdue' && t.status === 'PENDING');
    assert(
      '8. Query classification=overdue returns only overdue tasks (HTTP 200)',
      200,
      overdueQuery.status,
      allOverdue && overdueQuery.body.data.some((t: any) => t.id === overdueTask.id)
    );

    // Test 9: Filter by classification=today
    const todayQuery = await makeRequest(port, '/api/followups?classification=today', 'GET', undefined, exec1Token);
    const allToday = todayQuery.body.data.every((t: any) => t.classification === 'today' && t.status === 'PENDING');
    assert(
      '9. Query classification=today returns only today tasks (HTTP 200, Asia/Kolkata boundary)',
      200,
      todayQuery.status,
      allToday && todayQuery.body.data.some((t: any) => t.id === todayTask.id)
    );

    // Test 10: Filter by classification=upcoming
    const upcomingQuery = await makeRequest(port, '/api/followups?classification=upcoming', 'GET', undefined, exec1Token);
    const allUpcoming = upcomingQuery.body.data.every((t: any) => t.classification === 'upcoming' && t.status === 'PENDING');
    assert(
      '10. Query classification=upcoming returns only future tasks (HTTP 200)',
      200,
      upcomingQuery.status,
      allUpcoming && upcomingQuery.body.data.some((t: any) => t.id === upcomingTask.id)
    );

    // ── SINGLE DETAIL & ROLE ACCESS CONTROL TESTS ─────────────────

    // Test 11: Executive 1 accesses own follow-up
    const viewOwnTask = await makeRequest(port, `/api/followups/${todayTask.id}`, 'GET', undefined, exec1Token);
    assert(
      '11. Executive 1 accesses their own follow-up detail via GET /api/followups/:id (HTTP 200)',
      200,
      viewOwnTask.status,
      viewOwnTask.body.data.id === todayTask.id
    );

    // Test 12: Executive 1 forbidden from viewing Executive 2 follow-up
    const viewOtherTask = await makeRequest(port, `/api/followups/${exec2Task.id}`, 'GET', undefined, exec1Token);
    assert(
      '12. Executive 1 forbidden (HTTP 403) from viewing Executive 2 follow-up detail (IDOR Guard)',
      403,
      viewOtherTask.status
    );

    // Test 13: Admin accesses any follow-up detail
    const adminViewTask = await makeRequest(port, `/api/followups/${exec2Task.id}`, 'GET', undefined, adminToken);
    assert(
      '13. Admin accesses any follow-up detail with HTTP 200',
      200,
      adminViewTask.status,
      adminViewTask.body.data.id === exec2Task.id
    );

    // ── STATUS UPDATE TESTS (COMPLETED / CANCELLED) ───────────────

    // Test 14: Exec 1 marks follow-up as COMPLETED
    const markCompleted = await makeRequest(
      port,
      `/api/followups/${todayTask.id}/status`,
      'PATCH',
      { status: FollowUpStatus.COMPLETED, notes: 'Site visit completed successfully' },
      exec1Token
    );
    assert(
      '14. Executive 1 marks follow-up as COMPLETED (HTTP 200, completedAt populated)',
      200,
      markCompleted.status,
      markCompleted.body.data.status === FollowUpStatus.COMPLETED &&
      markCompleted.body.data.completedAt !== null &&
      markCompleted.body.data.classification === 'completed'
    );

    // Test 15: Exec 1 marks overdue follow-up as CANCELLED
    const markCancelled = await makeRequest(
      port,
      `/api/followups/${overdueTask.id}/status`,
      'PATCH',
      { status: FollowUpStatus.CANCELLED, notes: 'Client cancelled requirements' },
      exec1Token
    );
    assert(
      '15. Executive 1 marks follow-up as CANCELLED (HTTP 200)',
      200,
      markCancelled.status,
      markCancelled.body.data.status === FollowUpStatus.CANCELLED &&
      markCancelled.body.data.classification === 'cancelled'
    );

    // Test 16: Business rule: cannot update status of already COMPLETED task
    const duplicateStatusUpdate = await makeRequest(
      port,
      `/api/followups/${todayTask.id}/status`,
      'PATCH',
      { status: FollowUpStatus.COMPLETED },
      exec1Token
    );
    assert(
      '16. Business rule: rejecting status update on already completed follow-up with HTTP 400',
      400,
      duplicateStatusUpdate.status
    );

    // Test 17: Executive 2 cannot update status of Executive 1 follow-up
    const crossExecStatusUpdate = await makeRequest(
      port,
      `/api/followups/${upcomingTask.id}/status`,
      'PATCH',
      { status: FollowUpStatus.COMPLETED },
      exec2Token
    );
    assert(
      '17. Executive 2 forbidden (HTTP 403) from updating status of Executive 1 follow-up',
      403,
      crossExecStatusUpdate.status
    );

    // ── RESCHEDULING TESTS ────────────────────────────────────────

    // Test 18: Exec 1 reschedules pending upcoming task
    const newDueDate = new Date(Date.now() + 86400000 * 5); // 5 days from now
    const rescheduleResult = await makeRequest(
      port,
      `/api/followups/${upcomingTask.id}/reschedule`,
      'PATCH',
      { dueAt: newDueDate.toISOString(), notes: 'Customer asked for a later date' },
      exec1Token
    );
    assert(
      '18. Executive 1 reschedules pending follow-up (HTTP 200, existing record updated)',
      200,
      rescheduleResult.status,
      new Date(rescheduleResult.body.data.dueAt).getTime() === newDueDate.getTime() &&
      rescheduleResult.body.data.id === upcomingTask.id
    );

    // Test 19: Database verifies no duplicate created upon rescheduling
    const rescheduleCount = await prisma.followUp.count({ where: { leadId: lead1.id } });
    assert(
      '19. Database audit confirms rescheduling updates existing task without creating duplicates',
      200,
      rescheduleCount === 4 ? 200 : 500,
      rescheduleCount === 4
    );

    // Test 20: Business rule: cannot reschedule already COMPLETED task
    const rescheduleCompleted = await makeRequest(
      port,
      `/api/followups/${todayTask.id}/reschedule`,
      'PATCH',
      { dueAt: newDueDate.toISOString() },
      exec1Token
    );
    assert(
      '20. Business rule: rejecting reschedule on already completed task with HTTP 400',
      400,
      rescheduleCompleted.status
    );

    // Test 21: Executive 2 forbidden from rescheduling Executive 1 task
    const crossExecReschedule = await makeRequest(
      port,
      `/api/followups/${upcomingTask.id}/reschedule`,
      'PATCH',
      { dueAt: newDueDate.toISOString() },
      exec2Token
    );
    assert(
      '21. Executive 2 forbidden (HTTP 403) from rescheduling Executive 1 task',
      403,
      crossExecReschedule.status
    );

    // ── DIRECTORY SCOPING & ADMIN PERMISSIONS TESTS ───────────────

    // Test 22: Executive 1 query GET /api/followups returns strictly own tasks
    const exec1List = await makeRequest(port, '/api/followups', 'GET', undefined, exec1Token);
    const allExec1Tasks = exec1List.body.data.every((t: any) => t.executiveId === exec1User.id);
    assert(
      '22. Executive 1 GET /api/followups strictly scoped to own tasks (no cross-executive leakage)',
      200,
      exec1List.status,
      allExec1Tasks && exec1List.body.data.length >= 4
    );

    // Test 23: Admin GET /api/followups returns tasks across all executives
    const adminList = await makeRequest(port, '/api/followups', 'GET', undefined, adminToken);
    const hasExec1Tasks = adminList.body.data.some((t: any) => t.executiveId === exec1User.id);
    const hasExec2Tasks = adminList.body.data.some((t: any) => t.executiveId === exec2User.id);
    assert(
      '23. Admin GET /api/followups returns tasks across all executives',
      200,
      adminList.status,
      hasExec1Tasks && hasExec2Tasks
    );

    // Test 24: Admin filters tasks by executiveId
    const adminExecFilter = await makeRequest(port, `/api/followups?executiveId=${exec2User.id}`, 'GET', undefined, adminToken);
    const onlyExec2 = adminExecFilter.body.data.every((t: any) => t.executiveId === exec2User.id);
    assert(
      '24. Admin filters follow-ups by executiveId',
      200,
      adminExecFilter.status,
      onlyExec2 && adminExecFilter.body.data.length >= 1
    );

    // Test 25: Admin filters tasks by status=COMPLETED
    const adminCompletedFilter = await makeRequest(port, '/api/followups?status=COMPLETED', 'GET', undefined, adminToken);
    const onlyCompleted = adminCompletedFilter.body.data.every((t: any) => t.status === 'COMPLETED');
    assert(
      '25. Admin filters follow-ups by status=COMPLETED',
      200,
      adminCompletedFilter.status,
      onlyCompleted && adminCompletedFilter.body.data.length >= 1
    );

    // Test 26: Alternate alias /api/follow-ups also functional
    const altRouteGet = await makeRequest(port, '/api/follow-ups', 'GET', undefined, adminToken);
    assert(
      '26. Alternate alias GET /api/follow-ups returns HTTP 200 with identical results',
      200,
      altRouteGet.status,
      altRouteGet.body.data.length === adminList.body.data.length
    );

    // ── CLEANUP TEST DATA ─────────────────────────────────────────
    await prisma.followUp.deleteMany({ where: { leadId: { in: [lead1.id, lead2.id, lead3.id] } } });
    await prisma.lead.deleteMany({ where: { id: { in: [lead1.id, lead2.id, lead3.id] } } });

  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // Summary
  const passedCount = results.filter((r) => r.passed).length;
  const failedTests = results.filter((r) => !r.passed);

  console.log('\n------------------------------------------------------------');
  console.log(`TEST SUMMARY: ${passedCount}/${results.length} tests passed.`);
  if (failedTests.length === 0) {
    console.log('🎉 ALL FOLLOW-UP MANAGEMENT WORKFLOW TESTS PASSED!');
  } else {
    console.error(`❌ ${failedTests.length} TESTS FAILED:`);
    failedTests.forEach(f => console.error(`   - ${f.name} (Expected: ${f.expectedStatus}, Got: ${f.actualStatus})`));
    process.exit(1);
  }
  console.log('------------------------------------------------------------\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
