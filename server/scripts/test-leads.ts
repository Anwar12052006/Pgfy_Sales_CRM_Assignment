import 'dotenv/config';
import http from 'node:http';
import app from '../src/app.js';
import { prisma, Role, LeadStatus } from '../src/config/prisma.js';

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

function recordTest(
  name: string,
  expectedStatus: number,
  actualStatus: number,
  extraCondition = true,
  details?: unknown
) {
  const passed = actualStatus === expectedStatus && extraCondition;
  results.push({ name, expectedStatus, actualStatus, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(
    `${icon} [${actualStatus === expectedStatus ? actualStatus : `${actualStatus} (expected ${expectedStatus})`}] ${name}`
  );
  if (!passed && details) {
    console.error('   Details:', details);
  }
}

async function runLeadTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING PGFY SALES CRM LEAD & ASSIGNMENT TEST SUITE');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  try {
    // 1. Authenticate demo users to acquire JWT tokens
    const adminLogin = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    const adminToken = adminLogin.body.data.token;
    const adminId = adminLogin.body.data.user.id;

    const exec1Login = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales@pgfy.demo',
      password: 'Sales@123',
    });
    const exec1Token = exec1Login.body.data.token;
    const exec1Id = exec1Login.body.data.user.id;

    const exec2Login = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales2@pgfy.demo',
      password: 'Sales2@123',
    });
    const exec2Token = exec2Login.body.data.token;
    const exec2Id = exec2Login.body.data.user.id;

    // Fetch inactive user ID for testing inactive assignment
    const inactiveUser = await prisma.user.findUnique({
      where: { email: 'inactive@pgfy.demo' },
    });
    const inactiveUserId = inactiveUser?.id || '';

    // ==========================================
    // SECTION 1: GET /api/users/executives
    // ==========================================

    // Test 1: Admin lists active sales executives
    const resExecList = await makeRequest(port, '/api/users/executives', 'GET', undefined, adminToken);
    const execListValid =
      resExecList.body.data.length >= 2 &&
      resExecList.body.data.every((u: any) => u.role === 'SALES_EXECUTIVE' && u.isActive === true) &&
      !resExecList.body.data.some((u: any) => u.email === 'admin@pgfy.demo' || u.email === 'inactive@pgfy.demo');
    recordTest(
      '1. Admin lists active sales executives via GET /api/users/executives (excludes inactive & admin)',
      200,
      resExecList.status,
      execListValid
    );

    // Test 2: Sales Executive is forbidden from listing executives
    const resExecListDenied = await makeRequest(port, '/api/users/executives', 'GET', undefined, exec1Token);
    recordTest(
      '2. Sales Executive receives HTTP 403 Forbidden on GET /api/users/executives',
      403,
      resExecListDenied.status
    );

    // ==========================================
    // SECTION 2: LEAD CREATION & VALIDATION
    // ==========================================

    // Test 3: Non-admin (Sales Executive) forbidden from creating leads
    const res3 = await makeRequest(
      port,
      '/api/leads',
      'POST',
      {
        customerName: 'Unauthorized Test',
        mobileNumber: '9876543210',
        propertyCategory: 'Student PG',
        preferredLocation: 'Indiranagar',
        budget: 15000,
        leadSource: 'Walk-in',
      },
      exec1Token
    );
    recordTest('3. Executive receives HTTP 403 Forbidden on POST /api/leads', 403, res3.status);

    // Test 4: Validation rejects invalid Indian phone number
    const res4 = await makeRequest(
      port,
      '/api/leads',
      'POST',
      {
        customerName: 'Invalid Phone Test',
        mobileNumber: '12345678', // Not 10 digits
        propertyCategory: 'Student PG',
        preferredLocation: 'Koramangala',
        budget: 12000,
        leadSource: 'Google',
      },
      adminToken
    );
    recordTest('4. Validation rejects invalid phone number with HTTP 400', 400, res4.status);

    // Test 5: Validation rejects negative budget
    const res5 = await makeRequest(
      port,
      '/api/leads',
      'POST',
      {
        customerName: 'Negative Budget Test',
        mobileNumber: '9876543299',
        propertyCategory: 'Student PG',
        preferredLocation: 'Koramangala',
        budget: -5000,
        leadSource: 'Google',
      },
      adminToken
    );
    recordTest('5. Validation rejects negative budget with HTTP 400', 400, res5.status);

    // Test 6: Admin creates unassigned lead
    const res6 = await makeRequest(
      port,
      '/api/leads',
      'POST',
      {
        customerName: 'Vikram Malhotra',
        mobileNumber: '9876512345',
        email: 'vikram.m@example.com',
        propertyCategory: 'Premium PG - Single Room',
        preferredLocation: 'Whitefield, Bangalore',
        budget: 22000,
        leadSource: 'Website Enquiry',
      },
      adminToken
    );
    const createdLeadId = res6.body.data?.id;
    recordTest(
      '6. Admin creates unassigned lead with HTTP 201 (assignedExecutive is null)',
      201,
      res6.status,
      !!createdLeadId && res6.body.data.assignedExecutive === null
    );

    // ==========================================
    // SECTION 3: LISTING, SEARCH & ROLE SCOPING
    // ==========================================

    // Test 7: Admin views all leads with pagination metadata
    const res7 = await makeRequest(port, '/api/leads?page=1&limit=10', 'GET', undefined, adminToken);
    recordTest(
      '7. Admin views all leads with pagination metadata',
      200,
      res7.status,
      res7.body.pagination?.total >= 3 && res7.body.data?.length > 0
    );

    // Test 8: Search leads by customer name
    const res8 = await makeRequest(port, '/api/leads?search=Vikram', 'GET', undefined, adminToken);
    recordTest(
      '8. Search leads by customer name (case-insensitive)',
      200,
      res8.status,
      res8.body.data.some((l: any) => l.customerName === 'Vikram Malhotra')
    );

    // Test 9: Filter leads by status
    const res9 = await makeRequest(
      port,
      `/api/leads?status=${LeadStatus.INTERESTED}`,
      'GET',
      undefined,
      adminToken
    );
    recordTest(
      '9. Filter leads by status=INTERESTED',
      200,
      res9.status,
      res9.body.data.every((l: any) => l.status === LeadStatus.INTERESTED)
    );

    // Test 10: Filter unassigned leads (assigned=false)
    const res10 = await makeRequest(port, '/api/leads?assigned=false', 'GET', undefined, adminToken);
    recordTest(
      '10. Filter unassigned leads (assigned=false)',
      200,
      res10.status,
      res10.body.data.every((l: any) => l.assignedExecutiveId === null)
    );

    // Test 11: Filter leads by executiveId (Admin only)
    const res11 = await makeRequest(
      port,
      `/api/leads?executiveId=${exec1Id}`,
      'GET',
      undefined,
      adminToken
    );
    recordTest(
      '11. Filter leads by assigned executiveId',
      200,
      res11.status,
      res11.body.data.every((l: any) => l.assignedExecutiveId === exec1Id)
    );

    // Test 12: Executive retrieves ONLY their assigned leads
    const res12 = await makeRequest(port, '/api/leads', 'GET', undefined, exec1Token);
    recordTest(
      '12. Sales Executive retrieves strictly only their assigned leads',
      200,
      res12.status,
      res12.body.data.length > 0 &&
        res12.body.data.every((l: any) => l.assignedExecutiveId === exec1Id)
    );

    // ==========================================
    // SECTION 4: ASSIGNMENT, REASSIGNMENT & AUDITING
    // ==========================================

    // Test 13: Reject assignment to non-sales executive (e.g. assigning to Admin)
    const res13 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      {
        executiveId: adminId, // ADMIN, not SALES_EXECUTIVE
      },
      adminToken
    );
    recordTest(
      '13. Assignment to ADMIN role rejected with HTTP 400',
      400,
      res13.status,
      res13.body.message.includes('SALES_EXECUTIVE')
    );

    // Test 14: Reject assignment to inactive sales executive
    const res14 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      {
        executiveId: inactiveUserId, // Inactive user
      },
      adminToken
    );
    recordTest(
      '14. Assignment to deactivated executive rejected with HTTP 400',
      400,
      res14.status,
      res14.body.message.includes('deactivated')
    );

    // Test 15: Executive forbidden from assigning/reassigning leads
    const res15 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      {
        executiveId: exec1Id,
      },
      exec1Token
    );
    recordTest('15. Executive forbidden (HTTP 403) from assigning leads', 403, res15.status);

    // Test 16: First assignment: Admin assigns unassigned lead to Executive 1
    const res16 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      {
        executiveId: exec1Id,
      },
      adminToken
    );
    recordTest(
      '16. Admin assigns unassigned lead to Executive 1 (HTTP 200, assignedExecutive populated)',
      200,
      res16.status,
      res16.body.data.assignedExecutiveId === exec1Id &&
        res16.body.data.assignedExecutive?.email === 'sales@pgfy.demo'
    );

    // Test 17: Verify initial assignment record created in DB
    const initialAssignment = await prisma.leadAssignment.findFirst({
      where: { leadId: createdLeadId, executiveId: exec1Id },
    });
    recordTest(
      '17. Initial LeadAssignment record created in database with unassignedAt = null',
      200,
      initialAssignment ? 200 : 500,
      initialAssignment !== null && initialAssignment.unassignedAt === null
    );

    // Test 18: Reassignment: Admin reassigns lead from Executive 1 to Executive 2
    const res18 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      {
        executiveId: exec2Id,
      },
      adminToken
    );
    recordTest(
      '18. Admin reassigns lead from Executive 1 to Executive 2 (HTTP 200, assignedExecutive updated)',
      200,
      res18.status,
      res18.body.data.assignedExecutiveId === exec2Id &&
        res18.body.data.assignedExecutive?.email === 'sales2@pgfy.demo'
    );

    // Test 19: Verify historical audit in database
    const allAssignments = await prisma.leadAssignment.findMany({
      where: { leadId: createdLeadId },
      orderBy: { assignedAt: 'asc' },
    });
    const historyPreserved =
      allAssignments.length === 2 &&
      allAssignments[0]?.executiveId === exec1Id &&
      allAssignments[0]?.unassignedAt !== null &&
      allAssignments[1]?.executiveId === exec2Id &&
      allAssignments[1]?.unassignedAt === null;

    recordTest(
      '19. Database audit verified: previous assignment unassignedAt set, new assignment created',
      200,
      historyPreserved ? 200 : 500,
      historyPreserved
    );

    // Test 20: Admin retrieves complete assignment history via GET /api/leads/:id/assignments
    const resHistory = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assignments`,
      'GET',
      undefined,
      adminToken
    );
    const historyPayloadValid =
      resHistory.body.data?.totalAssignments === 2 &&
      resHistory.body.data?.assignments?.length === 2 &&
      resHistory.body.data?.assignments[0]?.executive?.email === 'sales2@pgfy.demo' &&
      resHistory.body.data?.assignments[1]?.executive?.email === 'sales@pgfy.demo';

    recordTest(
      '20. Admin retrieves assignment history via GET /api/leads/:id/assignments with full executive audit',
      200,
      resHistory.status,
      historyPayloadValid
    );

    // Test 21: Sales Executive forbidden from viewing assignment history
    const resHistoryDenied = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assignments`,
      'GET',
      undefined,
      exec1Token
    );
    recordTest(
      '21. Sales Executive forbidden (HTTP 403) from accessing assignment history',
      403,
      resHistoryDenied.status
    );

    // ==========================================
    // SECTION 5: EXECUTIVE DATA ISOLATION
    // ==========================================

    // Test 22: Executive 2 accesses assigned lead details -> 200 OK
    const res22 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}`,
      'GET',
      undefined,
      exec2Token
    );
    recordTest(
      '22. Assigned Executive 2 accesses lead details via GET /api/leads/:id (HTTP 200)',
      200,
      res22.status,
      res22.body.data?.customerName?.startsWith('Vikram')
    );

    // Test 23: Executive 1 forbidden from viewing Executive 2's lead
    const res23 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}`,
      'GET',
      undefined,
      exec1Token
    );
    recordTest(
      "23. Executive 1 forbidden (HTTP 403) from viewing Executive 2's assigned lead",
      403,
      res23.status
    );

    // Test 24: Executive 2 updates status of their assigned lead
    const res24 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/status`,
      'PATCH',
      {
        status: LeadStatus.VISIT_SCHEDULED,
      },
      exec2Token
    );
    recordTest(
      '24. Assigned Executive 2 updates status of their lead (HTTP 200)',
      200,
      res24.status,
      res24.body.data.status === LeadStatus.VISIT_SCHEDULED
    );

    // Test 25: Executive 1 forbidden from updating status of Executive 2's lead
    const res25 = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/status`,
      'PATCH',
      {
        status: LeadStatus.LOST,
      },
      exec1Token
    );
    recordTest(
      "25. Executive 1 forbidden (HTTP 403) from updating status of Executive 2's lead",
      403,
      res25.status
    );

    // Summary
    const total = results.length;
    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === total;

    console.log('\n------------------------------------------------------------');
    console.log(`TEST SUMMARY: ${passedCount}/${total} tests passed.`);
    if (allPassed) {
      console.log('🎉 ALL LEAD MANAGEMENT & ASSIGNMENT WORKFLOW TESTS PASSED!');
    } else {
      console.error(`❌ ${total - passedCount} TESTS FAILED.`);
    }
    console.log('------------------------------------------------------------\n');

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runLeadTestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
