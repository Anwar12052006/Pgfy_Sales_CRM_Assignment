import 'dotenv/config';
import http from 'node:http';
import app from '../src/app.js';
import { prisma, Role, LeadStatus, CallOutcome } from '../src/config/prisma.js';

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

function assert(name: string, expectedStatus: number, actualStatus: number, condition: boolean = true, details?: unknown) {
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
  console.log('🧪 RUNNING PGFY SALES CRM CALL TRACKING VERIFICATION SUITE');
  console.log('============================================================\n');

  // Start temporary server on a random port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5001;

  try {
    // 1. Authenticate users to obtain tokens
    const adminLogin = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    const adminToken = adminLogin.body.data.token;
    const adminUser = adminLogin.body.data.user;

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
    // Lead 1: Assigned to Exec 1
    const lead1 = await prisma.lead.create({
      data: {
        customerName: 'Call Test Customer 1',
        mobileNumber: '9988776655',
        propertyCategory: '2 BHK',
        preferredLocation: 'Koramangala',
        budget: 25000,
        leadSource: 'Website',
        status: LeadStatus.NEW,
        assignedExecutiveId: exec1User.id,
      },
    });

    // Lead 2: Assigned to Exec 2
    const lead2 = await prisma.lead.create({
      data: {
        customerName: 'Call Test Customer 2',
        mobileNumber: '9988776644',
        propertyCategory: '1 BHK',
        preferredLocation: 'Indiranagar',
        budget: 18000,
        leadSource: 'Referral',
        status: LeadStatus.NEW,
        assignedExecutiveId: exec2User.id,
      },
    });

    // Lead 3: Unassigned
    const lead3 = await prisma.lead.create({
      data: {
        customerName: 'Call Test Customer 3 (Unassigned)',
        mobileNumber: '9988776633',
        propertyCategory: '3 BHK',
        preferredLocation: 'Whitefield',
        budget: 45000,
        leadSource: 'Google Ads',
        status: LeadStatus.NEW,
        assignedExecutiveId: null,
      },
    });

    // ── AUTHENTICATION & VALIDATION TESTS ──────────────────────────

    // Test 1: Unauthenticated request to POST /api/calls rejected with 401
    const unauthPost = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 120,
      outcome: CallOutcome.CONNECTED,
    });
    assert('1. Unauthenticated request to POST /api/calls rejected with HTTP 401', 401, unauthPost.status);

    // Test 2: Unauthenticated request to GET /api/calls rejected with 401
    const unauthGet = await makeRequest(port, '/api/calls', 'GET');
    assert('2. Unauthenticated request to GET /api/calls rejected with HTTP 401', 401, unauthGet.status);

    // Test 3: Validation rejects missing leadId with 400
    const missingLeadId = await makeRequest(port, '/api/calls', 'POST', {
      durationSeconds: 60,
      outcome: CallOutcome.CONNECTED,
    }, exec1Token);
    assert('3. Validation rejects missing leadId with HTTP 400', 400, missingLeadId.status);

    // Test 4: Validation rejects negative duration with 400
    const negativeDuration = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: -10,
      outcome: CallOutcome.CONNECTED,
    }, exec1Token);
    assert('4. Validation rejects negative duration with HTTP 400', 400, negativeDuration.status);

    // Test 5: Validation rejects invalid outcome with 400
    const invalidOutcome = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 60,
      outcome: 'SUPER_INTERESTED_INVALID',
    }, exec1Token);
    assert('5. Validation rejects invalid outcome with HTTP 400', 400, invalidOutcome.status);

    // Test 6: Non-existent lead returns 404
    const nonExistentLead = await makeRequest(port, '/api/calls', 'POST', {
      leadId: '00000000-0000-4000-8000-000000000099',
      durationSeconds: 60,
      outcome: CallOutcome.CONNECTED,
    }, exec1Token);
    assert('6. Non-existent lead returns HTTP 404', 404, nonExistentLead.status);

    // ── EXECUTIVE ISOLATION & PERMISSION TESTS ────────────────────

    // Test 7: Exec 1 attempts to record call for Exec 2's lead -> 403 Forbidden
    const crossExecCall = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead2.id,
      durationSeconds: 90,
      outcome: CallOutcome.CONNECTED,
    }, exec1Token);
    assert(
      '7. Executive 1 forbidden (HTTP 403) from logging call for Executive 2 assigned lead',
      403,
      crossExecCall.status
    );

    // Test 8: Exec 1 attempts to record call for unassigned lead -> 403 Forbidden
    const unassignedCall = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead3.id,
      durationSeconds: 90,
      outcome: CallOutcome.CONNECTED,
    }, exec1Token);
    assert(
      '8. Executive forbidden (HTTP 403) from logging call for unassigned lead',
      403,
      unassignedCall.status
    );

    // ── CALL RECORDING & LEAD STATUS PROGRESSION TESTS ────────────

    // Test 9: Exec 1 records call on their assigned lead with outcome CONNECTED
    const call1 = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 150,
      outcome: CallOutcome.CONNECTED,
      notes: 'Customer asked about amenities and sharing options.',
    }, exec1Token);
    assert(
      '9. Executive 1 records CONNECTED call (HTTP 201, executiveId matches JWT identity)',
      201,
      call1.status,
      call1.body.data.executiveId === exec1User.id &&
      call1.body.data.durationSeconds === 150 &&
      call1.body.data.outcome === CallOutcome.CONNECTED
    );

    // Test 10: Outcome INTERESTED automatically advances lead status to INTERESTED
    const callInterested = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 240,
      outcome: CallOutcome.INTERESTED,
      notes: 'Prospect confirmed interest in 2 BHK flat.',
    }, exec1Token);
    assert(
      '10. Outcome INTERESTED automatically updates lead status to INTERESTED',
      201,
      callInterested.status,
      callInterested.body.data.lead.status === LeadStatus.INTERESTED
    );

    // Test 11: Outcome NOT_INTERESTED automatically updates lead status to NOT_INTERESTED
    const callNotInterested = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 45,
      outcome: CallOutcome.NOT_INTERESTED,
      notes: 'Budget mismatch, decided on paying guest instead.',
    }, exec1Token);
    assert(
      '11. Outcome NOT_INTERESTED automatically updates lead status to NOT_INTERESTED',
      201,
      callNotInterested.status,
      callNotInterested.body.data.lead.status === LeadStatus.NOT_INTERESTED
    );

    // Test 12: Outcome CALL_BACK_REQUESTED automatically updates lead status to FOLLOW_UP
    const callBackCall = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 30,
      outcome: CallOutcome.CALL_BACK_REQUESTED,
      notes: 'Currently in a meeting, requested callback after 6 PM.',
    }, exec1Token);
    assert(
      '12. Outcome CALL_BACK_REQUESTED automatically updates lead status to FOLLOW_UP',
      201,
      callBackCall.status,
      callBackCall.body.data.lead.status === LeadStatus.FOLLOW_UP
    );

    // Test 13: Outcome VISIT_SCHEDULED automatically updates lead status to VISIT_SCHEDULED
    const visitCall = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 180,
      outcome: CallOutcome.VISIT_SCHEDULED,
      notes: 'Physical site visit confirmed for Saturday morning.',
    }, exec1Token);
    assert(
      '13. Outcome VISIT_SCHEDULED automatically updates lead status to VISIT_SCHEDULED',
      201,
      visitCall.status,
      visitCall.body.data.lead.status === LeadStatus.VISIT_SCHEDULED
    );

    // Test 14: Outcome CONVERTED automatically updates lead status to CONVERTED
    const convertedCall = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 300,
      outcome: CallOutcome.CONVERTED,
      notes: 'Token advance paid, booking finalized!',
    }, exec1Token);
    assert(
      '14. Outcome CONVERTED automatically updates lead status to CONVERTED',
      201,
      convertedCall.status,
      convertedCall.body.data.lead.status === LeadStatus.CONVERTED
    );

    // Test 15: Additional outcomes (NOT_ANSWERED, BUSY, SWITCHED_OFF) logged successfully
    const callBusy = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 0,
      outcome: CallOutcome.BUSY,
      notes: 'Line was busy on first attempt.',
    }, exec1Token);
    assert('15. Outcome BUSY logged successfully with 0 duration', 201, callBusy.status);

    const callSwitchedOff = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 0,
      outcome: CallOutcome.SWITCHED_OFF,
      notes: 'Phone switched off.',
    }, exec1Token);
    assert('16. Outcome SWITCHED_OFF logged successfully', 201, callSwitchedOff.status);

    const callNotAnswered = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 0,
      outcome: CallOutcome.NOT_ANSWERED,
      notes: 'Ringing, no answer.',
    }, exec1Token);
    assert('17. Outcome NOT_ANSWERED logged successfully', 201, callNotAnswered.status);

    // ── FOLLOW-UP INTEGRATION TESTS ───────────────────────────────

    // Test 16: Linked Follow-Up scheduling inside Prisma transaction
    const followUpDate = new Date(Date.now() + 86400000 * 2); // 2 days from now
    const callWithFollowUp = await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead1.id,
      durationSeconds: 110,
      outcome: CallOutcome.CALL_BACK_REQUESTED,
      notes: 'Will check with roommates and let us know.',
      nextFollowUpDate: followUpDate.toISOString(),
      nextFollowUpNotes: 'Call back to confirm room inspection timing',
    }, exec1Token);

    assert(
      '18. Linked FollowUp created atomically inside transaction with callId and PENDING status',
      201,
      callWithFollowUp.status,
      callWithFollowUp.body.data.followUps.length === 1 &&
      callWithFollowUp.body.data.followUps[0].status === 'PENDING' &&
      callWithFollowUp.body.data.followUps[0].callId === callWithFollowUp.body.data.id
    );

    // Test 17: Database audit verification for linked FollowUp
    const dbFollowUp = await prisma.followUp.findFirst({
      where: { callId: callWithFollowUp.body.data.id },
    });
    assert(
      '19. Database FollowUp verified: leadId, executiveId and callId correctly linked',
      200,
      dbFollowUp ? 200 : 404,
      dbFollowUp?.leadId === lead1.id &&
      dbFollowUp?.executiveId === exec1User.id &&
      dbFollowUp?.status === 'PENDING'
    );

    // ── CALL HISTORY IMMUTABILITY & RETRIEVAL TESTS ────────────────

    // Test 18: Multiple calls for the same lead all preserved (never overwritten)
    const dbCallCount = await prisma.call.count({ where: { leadId: lead1.id } });
    assert(
      '20. Call history immutability verified: all logged calls exist in database without overwriting',
      200,
      dbCallCount >= 8 ? 200 : 500,
      dbCallCount >= 8
    );

    // Test 19: GET /api/leads/:leadId/calls retrieves call history for assigned executive
    const leadCallHistory = await makeRequest(port, `/api/leads/${lead1.id}/calls`, 'GET', undefined, exec1Token);
    assert(
      '21. Executive 1 retrieves call history via GET /api/leads/:leadId/calls',
      200,
      leadCallHistory.status,
      leadCallHistory.body.data.calls.length >= 8 &&
      leadCallHistory.body.data.lead.id === lead1.id
    );

    // Test 20: GET /api/leads/:leadId/calls is forbidden for non-assigned Executive 2
    const leadCallHistoryExec2 = await makeRequest(port, `/api/leads/${lead1.id}/calls`, 'GET', undefined, exec2Token);
    assert(
      '22. Executive 2 forbidden (HTTP 403) from accessing call history of Executive 1 lead',
      403,
      leadCallHistoryExec2.status
    );

    // Test 21: GET /api/calls/lead/:leadId also retrieves call history
    const altLeadCallHistory = await makeRequest(port, `/api/calls/lead/${lead1.id}`, 'GET', undefined, exec1Token);
    assert(
      '23. GET /api/calls/lead/:leadId retrieves call history successfully',
      200,
      altLeadCallHistory.status,
      altLeadCallHistory.body.data.calls.length >= 8
    );

    // Test 22: Admin retrieves call history for any lead
    const adminLeadCallHistory = await makeRequest(port, `/api/leads/${lead1.id}/calls`, 'GET', undefined, adminToken);
    assert(
      '24. Admin accesses call history for any lead with HTTP 200',
      200,
      adminLeadCallHistory.status,
      adminLeadCallHistory.body.data.calls.length >= 8
    );

    // ── LISTING, FILTERING & RBAC CALL DIRECTORY TESTS ────────────

    // Exec 2 logs a call on lead 2
    await makeRequest(port, '/api/calls', 'POST', {
      leadId: lead2.id,
      durationSeconds: 180,
      outcome: CallOutcome.INTERESTED,
      notes: 'Customer interested in Indiranagar property.',
    }, exec2Token);

    // Test 23: Executive 1 GET /api/calls returns strictly their own calls
    const exec1CallsList = await makeRequest(port, '/api/calls', 'GET', undefined, exec1Token);
    const allExec1 = exec1CallsList.body.data.every((c: any) => c.executiveId === exec1User.id);
    assert(
      '25. Executive 1 GET /api/calls strictly scoped to own calls (no cross-executive leakage)',
      200,
      exec1CallsList.status,
      allExec1 && exec1CallsList.body.data.length >= 8
    );

    // Test 24: Admin GET /api/calls returns calls from both executives
    const adminCallsList = await makeRequest(port, '/api/calls', 'GET', undefined, adminToken);
    const hasExec1 = adminCallsList.body.data.some((c: any) => c.executiveId === exec1User.id);
    const hasExec2 = adminCallsList.body.data.some((c: any) => c.executiveId === exec2User.id);
    assert(
      '26. Admin GET /api/calls returns calls across all executives',
      200,
      adminCallsList.status,
      hasExec1 && hasExec2
    );

    // Test 25: Filter calls by outcome=CONVERTED
    const filterOutcome = await makeRequest(port, '/api/calls?outcome=CONVERTED', 'GET', undefined, adminToken);
    const allConverted = filterOutcome.body.data.every((c: any) => c.outcome === CallOutcome.CONVERTED);
    assert(
      '27. Admin filters calls by outcome=CONVERTED',
      200,
      filterOutcome.status,
      allConverted && filterOutcome.body.data.length >= 1
    );

    // Test 26: Admin filters calls by executiveId
    const filterExec = await makeRequest(port, `/api/calls?executiveId=${exec2User.id}`, 'GET', undefined, adminToken);
    const allExec2 = filterExec.body.data.every((c: any) => c.executiveId === exec2User.id);
    assert(
      '28. Admin filters calls by executiveId',
      200,
      filterExec.status,
      allExec2 && filterExec.body.data.length >= 1
    );

    // Test 27: Pagination metadata verified
    const paginatedCalls = await makeRequest(port, '/api/calls?page=1&limit=5', 'GET', undefined, adminToken);
    assert(
      '29. Pagination metadata returned accurately (page, limit, total, totalPages)',
      200,
      paginatedCalls.status,
      paginatedCalls.body.pagination.page === 1 &&
      paginatedCalls.body.pagination.limit === 5 &&
      paginatedCalls.body.pagination.total >= 9
    );

    // ── SINGLE CALL DETAIL VIEW & ACCESS CONTROL ──────────────────

    // Test 28: Exec 1 views their own call detail -> HTTP 200
    const viewOwnCall = await makeRequest(port, `/api/calls/${call1.body.data.id}`, 'GET', undefined, exec1Token);
    assert(
      '30. Executive 1 accesses their own call detail via GET /api/calls/:id (HTTP 200)',
      200,
      viewOwnCall.status,
      viewOwnCall.body.data.id === call1.body.data.id
    );

    // Test 29: Exec 2 forbidden from viewing Exec 1's call detail -> HTTP 403
    const viewOtherCall = await makeRequest(port, `/api/calls/${call1.body.data.id}`, 'GET', undefined, exec2Token);
    assert(
      '31. Executive 2 forbidden (HTTP 403) from accessing Executive 1 call detail',
      403,
      viewOtherCall.status
    );

    // Test 30: Admin can view any call detail -> HTTP 200
    const adminViewCall = await makeRequest(port, `/api/calls/${call1.body.data.id}`, 'GET', undefined, adminToken);
    assert(
      '32. Admin accesses any call detail via GET /api/calls/:id with HTTP 200',
      200,
      adminViewCall.status,
      adminViewCall.body.data.id === call1.body.data.id
    );

    // ── CLEANUP TEST DATA ─────────────────────────────────────────
    await prisma.followUp.deleteMany({ where: { leadId: { in: [lead1.id, lead2.id, lead3.id] } } });
    await prisma.call.deleteMany({ where: { leadId: { in: [lead1.id, lead2.id, lead3.id] } } });
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
    console.log('🎉 ALL CALL TRACKING & INTERACTION WORKFLOW TESTS PASSED!');
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
