import { authService } from '../src/services/auth.service.js';
import { dashboardService } from '../src/services/dashboard.service.js';
import app from '../src/app.js';
import http from 'http';

interface TestResponse {
  statusCode: number;
  body: any;
}

function makeRequest(
  options: http.RequestOptions,
  bodyData?: any
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode || 500,
            body: data ? JSON.parse(data) : {},
          });
        } catch {
          resolve({
            statusCode: res.statusCode || 500,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runDashboardTests() {
  console.log('🧪 Starting Admin Dashboard & RBAC API Verification...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Start test server
  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;

  try {
    // 1. Authenticate Admin and Executive
    const adminAuth = await authService.login({
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    const execAuth = await authService.login({
      email: 'sales@pgfy.demo',
      password: 'Sales@123',
    });

    const adminToken = adminAuth.token;
    const execToken = execAuth.token;

    // Test 1: Unauthenticated request should return HTTP 401
    const unauthRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/admin',
      method: 'GET',
    });
    assert(
      unauthRes.statusCode === 401,
      'Unauthenticated request to GET /api/dashboard/admin is rejected with HTTP 401'
    );

    // Test 2: Sales Executive request should return HTTP 403 Forbidden
    const execRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/admin',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${execToken}`,
      },
    });
    assert(
      execRes.statusCode === 403,
      'Sales Executive token is rejected from GET /api/dashboard/admin with HTTP 403 Forbidden'
    );

    // Test 3: Admin request should return HTTP 200 OK
    const adminRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/admin',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(
      adminRes.statusCode === 200,
      'Admin token accesses GET /api/dashboard/admin with HTTP 200 OK'
    );

    const data = adminRes.body.data;
    assert(data && typeof data === 'object', 'Admin dashboard returns data object');

    // Test 4: Validate required top-level metric fields
    assert(typeof data.totalLeads === 'number' && data.totalLeads > 0, `Total leads returned: ${data.totalLeads}`);
    assert(typeof data.assignedLeads === 'number', `Assigned leads returned: ${data.assignedLeads}`);
    assert(typeof data.unassignedLeads === 'number', `Unassigned leads returned: ${data.unassignedLeads}`);
    assert(
      data.totalLeads === data.assignedLeads + data.unassignedLeads,
      'Total leads equals assignedLeads + unassignedLeads'
    );
    assert(typeof data.totalCalls === 'number', `Total calls returned: ${data.totalCalls}`);
    assert(typeof data.connectedCalls === 'number', `Connected calls returned: ${data.connectedCalls}`);
    assert(typeof data.pendingFollowUps === 'number', `Pending follow-ups returned: ${data.pendingFollowUps}`);
    assert(typeof data.overdueFollowUps === 'number', `Overdue follow-ups returned: ${data.overdueFollowUps}`);
    assert(typeof data.convertedLeads === 'number', `Converted leads returned: ${data.convertedLeads}`);

    // Test 5: Validate lead status breakdown
    assert(
      data.leadStatusBreakdown && typeof data.leadStatusBreakdown === 'object',
      'Lead status breakdown dictionary returned'
    );
    const sumStatuses = Object.values(data.leadStatusBreakdown as Record<string, number>).reduce(
      (a: number, b: number) => a + b,
      0
    );
    assert(
      sumStatuses === data.totalLeads,
      `Sum of lead statuses (${sumStatuses}) equals total leads (${data.totalLeads})`
    );

    // Test 6: Validate executive performance
    assert(
      Array.isArray(data.executivePerformance) && data.executivePerformance.length > 0,
      `Executive performance returned for ${data.executivePerformance.length} executives`
    );

    const firstExec = data.executivePerformance[0];
    assert(typeof firstExec.executiveName === 'string', `Executive name present: ${firstExec.executiveName}`);
    assert(typeof firstExec.assignedLeads === 'number', `Assigned leads present: ${firstExec.assignedLeads}`);
    assert(typeof firstExec.leadsContacted === 'number', `Leads contacted present: ${firstExec.leadsContacted}`);
    assert(typeof firstExec.convertedLeads === 'number', `Converted leads present: ${firstExec.convertedLeads}`);
    assert(typeof firstExec.callCoverageRate === 'number', `Call coverage rate: ${firstExec.callCoverageRate}%`);
    assert(typeof firstExec.conversionRate === 'number', `Conversion rate: ${firstExec.conversionRate}%`);
    assert(typeof firstExec.connectionRate === 'number', `Connection rate: ${firstExec.connectionRate}%`);

    // Safe division check
    for (const exec of data.executivePerformance) {
      if (exec.assignedLeads === 0) {
        assert(exec.callCoverageRate === 0, 'Safe zero coverage when 0 assigned');
        assert(exec.conversionRate === 0, 'Safe zero conversion when 0 assigned');
      }
      if (exec.totalCalls === 0) {
        assert(exec.connectionRate === 0, 'Safe zero connection rate when 0 calls');
      }
    }

    // Test 7: Validate recent leads
    assert(
      Array.isArray(data.recentLeads) && data.recentLeads.length > 0,
      `Recent leads list returned with ${data.recentLeads.length} leads`
    );

    // ==========================================
    // EXECUTIVE DASHBOARD TESTS (JWT Scoping & Data Isolation)
    // ==========================================
    console.log('\n🧪 Testing Executive Dashboard (GET /api/dashboard/executive)...');

    // Test 8: Unauthenticated GET /api/dashboard/executive rejected with 401
    const execUnauthRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/executive',
      method: 'GET',
    });
    assert(
      execUnauthRes.statusCode === 401,
      'Unauthenticated request to GET /api/dashboard/executive is rejected with HTTP 401'
    );

    // Test 9: Executive 1 gets their scoped dashboard with HTTP 200
    const exec1Res = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/executive',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${execToken}`,
      },
    });
    assert(
      exec1Res.statusCode === 200,
      'Executive 1 accesses GET /api/dashboard/executive with HTTP 200 OK'
    );

    const exec1Data = exec1Res.body.data;
    assert(exec1Data.executiveName === execAuth.user.name, `Executive name returned matches JWT: ${exec1Data.executiveName}`);
    assert(typeof exec1Data.assignedLeads === 'number', `Executive 1 assigned leads: ${exec1Data.assignedLeads}`);
    assert(typeof exec1Data.leadsContacted === 'number', `Executive 1 leads contacted: ${exec1Data.leadsContacted}`);
    assert(typeof exec1Data.convertedLeads === 'number', `Executive 1 converted leads: ${exec1Data.convertedLeads}`);
    assert(typeof exec1Data.totalCalls === 'number', `Executive 1 total calls: ${exec1Data.totalCalls}`);
    assert(typeof exec1Data.connectedCalls === 'number', `Executive 1 connected calls: ${exec1Data.connectedCalls}`);
    assert(typeof exec1Data.pendingFollowUps === 'number', `Executive 1 pending follow-ups: ${exec1Data.pendingFollowUps}`);
    assert(typeof exec1Data.overdueFollowUps === 'number', `Executive 1 overdue follow-ups: ${exec1Data.overdueFollowUps}`);
    assert(typeof exec1Data.callCoverageRate === 'number', `Executive 1 call coverage rate: ${exec1Data.callCoverageRate}%`);
    assert(typeof exec1Data.conversionRate === 'number', `Executive 1 conversion rate: ${exec1Data.conversionRate}%`);
    assert(typeof exec1Data.connectionRate === 'number', `Executive 1 connection rate: ${exec1Data.connectionRate}%`);
    assert(Array.isArray(exec1Data.recentLeads), 'Executive 1 recent leads returned as array');

    // Test 10: Executive 2 data isolation
    const exec2Auth = await authService.login({
      email: 'sales2@pgfy.demo',
      password: 'Sales2@123',
    });
    const exec2Res = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/executive',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${exec2Auth.token}`,
      },
    });
    assert(
      exec2Res.statusCode === 200,
      'Executive 2 accesses GET /api/dashboard/executive with HTTP 200 OK'
    );
    const exec2Data = exec2Res.body.data;
    assert(exec2Data.executiveName === exec2Auth.user.name, `Executive 2 name matches: ${exec2Data.executiveName}`);
    assert(
      exec1Data.assignedLeads + exec2Data.assignedLeads === data.assignedLeads,
      `Strict data isolation: Exec1 (${exec1Data.assignedLeads}) + Exec2 (${exec2Data.assignedLeads}) === Total Assigned (${data.assignedLeads})`
    );

    // ==========================================
    // ADMIN PERFORMANCE ANALYTICS API (GET /api/dashboard/admin/performance)
    // ==========================================
    console.log('\n🧪 Testing Admin Performance Analytics (GET /api/dashboard/admin/performance)...');

    // Test 11: Unauthenticated request to /admin/performance rejected with HTTP 401
    const unauthPerfRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/admin/performance',
      method: 'GET',
    });
    assert(
      unauthPerfRes.statusCode === 401,
      'Unauthenticated request to GET /api/dashboard/admin/performance is rejected with HTTP 401'
    );

    // Test 12: Sales Executive request rejected with HTTP 403 Forbidden
    const execPerfRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/admin/performance',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${execToken}`,
      },
    });
    assert(
      execPerfRes.statusCode === 403,
      'Sales Executive token rejected from GET /api/dashboard/admin/performance with HTTP 403 Forbidden'
    );

    // Test 13: Admin accesses GET /api/dashboard/admin/performance with HTTP 200 OK
    const adminPerfRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/dashboard/admin/performance',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });
    assert(
      adminPerfRes.statusCode === 200,
      'Admin token accesses GET /api/dashboard/admin/performance with HTTP 200 OK'
    );

    const perfData = adminPerfRes.body.data;
    assert(Array.isArray(perfData), 'Performance data returned as an array of executive metrics');
    assert(perfData.length >= 2, `Performance metrics returned for ${perfData.length} active executives`);

    const pExec = perfData[0];
    assert(typeof pExec.executiveName === 'string', 'Performance record contains executiveName');
    assert(typeof pExec.totalAssignedLeads === 'number', 'Performance record contains totalAssignedLeads');
    assert(typeof pExec.uniqueLeadsContacted === 'number', 'Performance record contains uniqueLeadsContacted');
    assert(typeof pExec.convertedLeads === 'number', 'Performance record contains convertedLeads');
    assert(typeof pExec.totalCalls === 'number', 'Performance record contains totalCalls');
    assert(typeof pExec.connectedCalls === 'number', 'Performance record contains connectedCalls');
    assert(typeof pExec.pendingFollowUps === 'number', 'Performance record contains pendingFollowUps');
    assert(typeof pExec.overdueFollowUps === 'number', 'Performance record contains overdueFollowUps');
    assert(typeof pExec.callCoverageRate === 'number', 'Performance record contains callCoverageRate');
    assert(typeof pExec.conversionRate === 'number', 'Performance record contains conversionRate');
    assert(typeof pExec.connectionRate === 'number', 'Performance record contains connectionRate');

    // ==========================================
    // RIGOROUS FORMULA VERIFICATION WITH KNOWN DATASETS
    // ==========================================
    console.log('\n🧪 Testing Analytics Mathematical Formulas with Known Dataset...');

    const { prisma, LeadStatus, CallOutcome } = await import('../src/config/prisma.js');
    const bcrypt = await import('bcryptjs');

    // Create a dedicated test sales executive
    const testExecEmail = `analytics-test-${Date.now()}@pgfy.demo`;
    const passwordHash = await bcrypt.default.hash('Test@123', 10);
    const testExec = await prisma.user.create({
      data: {
        name: 'Analytics Test Executive',
        email: testExecEmail,
        password: passwordHash,
        role: 'SALES_EXECUTIVE',
        isActive: true,
      },
    });

    try {
      // 1. Zero Division Check: Executive with 0 assigned leads and 0 calls
      const zeroMetrics = await dashboardService.getExecutiveDashboard(testExec.id);
      assert(zeroMetrics.assignedLeads === 0, 'Zero state: assigned leads is 0');
      assert(zeroMetrics.totalCalls === 0, 'Zero state: total calls is 0');
      assert(zeroMetrics.callCoverageRate === 0, 'Zero state: safe division returns 0 for callCoverageRate');
      assert(zeroMetrics.conversionRate === 0, 'Zero state: safe division returns 0 for conversionRate');
      assert(zeroMetrics.connectionRate === 0, 'Zero state: safe division returns 0 for connectionRate');

      // 2. Known Dataset Setup:
      // Executive assigned 4 leads:
      // Lead 1: Called 2 times (both CONNECTED)
      // Lead 2: Called 1 time (NOT_ANSWERED)
      // Lead 3: 0 calls (never contacted)
      // Lead 4: Called 1 time (CONNECTED), Status: CONVERTED
      const now = new Date();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const lead1 = await prisma.lead.create({
        data: {
          customerName: 'Analytics Test Lead 1',
          mobileNumber: '9900112233',
          propertyCategory: '1 BHK',
          preferredLocation: 'Koramangala',
          budget: 20000,
          leadSource: 'Website',
          status: LeadStatus.CONTACTED,
          assignedExecutiveId: testExec.id,
          createdAt: yesterday,
        },
      });
      await prisma.leadAssignment.create({
        data: {
          leadId: lead1.id,
          executiveId: testExec.id,
          assignedById: adminAuth.user.id,
          assignedAt: yesterday,
        },
      });

      const lead2 = await prisma.lead.create({
        data: {
          customerName: 'Analytics Test Lead 2',
          mobileNumber: '9900112234',
          propertyCategory: '2 BHK',
          preferredLocation: 'Indiranagar',
          budget: 35000,
          leadSource: 'Google Ads',
          status: LeadStatus.CONTACTED,
          assignedExecutiveId: testExec.id,
          createdAt: yesterday,
        },
      });
      await prisma.leadAssignment.create({
        data: {
          leadId: lead2.id,
          executiveId: testExec.id,
          assignedById: adminAuth.user.id,
          assignedAt: yesterday,
        },
      });

      const lead3 = await prisma.lead.create({
        data: {
          customerName: 'Analytics Test Lead 3',
          mobileNumber: '9900112235',
          propertyCategory: 'Studio Apartment',
          preferredLocation: 'Whitefield',
          budget: 18000,
          leadSource: 'Referral',
          status: LeadStatus.NEW,
          assignedExecutiveId: testExec.id,
          createdAt: yesterday,
        },
      });
      await prisma.leadAssignment.create({
        data: {
          leadId: lead3.id,
          executiveId: testExec.id,
          assignedById: adminAuth.user.id,
          assignedAt: yesterday,
        },
      });

      const lead4 = await prisma.lead.create({
        data: {
          customerName: 'Analytics Test Lead 4',
          mobileNumber: '9900112236',
          propertyCategory: 'Villa',
          preferredLocation: 'Sarjapur Road',
          budget: 75000,
          leadSource: 'Direct Enquiry',
          status: LeadStatus.CONVERTED,
          assignedExecutiveId: testExec.id,
          createdAt: yesterday,
        },
      });
      await prisma.leadAssignment.create({
        data: {
          leadId: lead4.id,
          executiveId: testExec.id,
          assignedById: adminAuth.user.id,
          assignedAt: yesterday,
        },
      });

      // Calls:
      // Lead 1: 2 calls (both CONNECTED)
      await prisma.call.create({
        data: {
          leadId: lead1.id,
          executiveId: testExec.id,
          durationSeconds: 120,
          outcome: CallOutcome.CONNECTED,
          callDateTime: now,
        },
      });
      await prisma.call.create({
        data: {
          leadId: lead1.id,
          executiveId: testExec.id,
          durationSeconds: 90,
          outcome: CallOutcome.CONNECTED,
          callDateTime: now,
        },
      });

      // Lead 2: 1 call (NOT_ANSWERED)
      await prisma.call.create({
        data: {
          leadId: lead2.id,
          executiveId: testExec.id,
          durationSeconds: 0,
          outcome: CallOutcome.NOT_ANSWERED,
          callDateTime: now,
        },
      });

      // Lead 4: 1 call (CONNECTED)
      await prisma.call.create({
        data: {
          leadId: lead4.id,
          executiveId: testExec.id,
          durationSeconds: 180,
          outcome: CallOutcome.CONNECTED,
          callDateTime: now,
        },
      });

      // 3. Query metrics for this test executive
      const knownMetrics = await dashboardService.getExecutiveDashboard(testExec.id);

      // Verify Denominator: Total assigned leads = 4
      assert(knownMetrics.assignedLeads === 4, `Known Dataset: Total assigned leads is 4 (actual: ${knownMetrics.assignedLeads})`);

      // Verify Numerator 1: Unique assigned leads contacted = 3 (Lead 1, Lead 2, Lead 4; Lead 1 called twice only counted once)
      assert(knownMetrics.uniqueLeadsContacted === 3, `Known Dataset: Unique leads contacted is 3 (actual: ${knownMetrics.uniqueLeadsContacted})`);

      // Verify Formula 1: Call Coverage Rate = (3 / 4) * 100 = 75.0%
      assert(knownMetrics.callCoverageRate === 75.0, `Known Dataset: Call coverage rate is exactly 75.0% (actual: ${knownMetrics.callCoverageRate}%)`);

      // Verify Numerator 2: Converted leads = 1 (Lead 4)
      assert(knownMetrics.convertedLeads === 1, `Known Dataset: Converted assigned leads is 1 (actual: ${knownMetrics.convertedLeads})`);

      // Verify Formula 2: Conversion Rate = (1 / 4) * 100 = 25.0%
      assert(knownMetrics.conversionRate === 25.0, `Known Dataset: Conversion rate is exactly 25.0% (actual: ${knownMetrics.conversionRate}%)`);

      // Verify Numerator 3: Connected calls = 3 (Lead 1: 2, Lead 4: 1)
      assert(knownMetrics.connectedCalls === 3, `Known Dataset: Connected calls is 3 (actual: ${knownMetrics.connectedCalls})`);

      // Verify Total Calls = 4
      assert(knownMetrics.totalCalls === 4, `Known Dataset: Total calls is 4 (actual: ${knownMetrics.totalCalls})`);

      // Verify Formula 3: Connection Rate = (3 / 4) * 100 = 75.0%
      assert(knownMetrics.connectionRate === 75.0, `Known Dataset: Connection rate is exactly 75.0% (actual: ${knownMetrics.connectionRate}%)`);

      // 4. Test Duplicate Calls Avoidance: Add 3 more calls to Lead 1
      await prisma.call.create({
        data: {
          leadId: lead1.id,
          executiveId: testExec.id,
          durationSeconds: 45,
          outcome: CallOutcome.CONNECTED,
          callDateTime: now,
        },
      });
      await prisma.call.create({
        data: {
          leadId: lead1.id,
          executiveId: testExec.id,
          durationSeconds: 60,
          outcome: CallOutcome.CONNECTED,
          callDateTime: now,
        },
      });

      const dupeMetrics = await dashboardService.getExecutiveDashboard(testExec.id);
      // Unique contacted leads must REMAIN 3, not increase to 5
      assert(
        dupeMetrics.uniqueLeadsContacted === 3,
        `Duplicate Call Protection: 5 calls across 3 leads still yields exactly 3 unique contacted leads (actual: ${dupeMetrics.uniqueLeadsContacted})`
      );
      assert(
        dupeMetrics.callCoverageRate === 75.0,
        `Duplicate Call Protection: Call coverage remains 75.0% despite repeat calls (actual: ${dupeMetrics.callCoverageRate}%)`
      );
      assert(dupeMetrics.totalCalls === 6, `Total calls updated to 6 (actual: ${dupeMetrics.totalCalls})`);
      assert(dupeMetrics.connectedCalls === 5, `Connected calls updated to 5 (actual: ${dupeMetrics.connectedCalls})`);
      // Connection Rate = (5 / 6) * 100 = 83.3%
      assert(dupeMetrics.connectionRate === 83.3, `Updated connection rate: (5/6)*100 = 83.3% (actual: ${dupeMetrics.connectionRate}%)`);

      // 5. Cleanup test data
      await prisma.call.deleteMany({ where: { executiveId: testExec.id } });
      await prisma.leadAssignment.deleteMany({ where: { executiveId: testExec.id } });
      await prisma.lead.deleteMany({ where: { assignedExecutiveId: testExec.id } });
      await prisma.user.delete({ where: { id: testExec.id } });
      console.log('  🧹 Cleaned up known dataset test records.');
    } catch (cleanupErr) {
      await prisma.call.deleteMany({ where: { executiveId: testExec.id } }).catch(() => {});
      await prisma.leadAssignment.deleteMany({ where: { executiveId: testExec.id } }).catch(() => {});
      await prisma.lead.deleteMany({ where: { assignedExecutiveId: testExec.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: testExec.id } }).catch(() => {});
      throw cleanupErr;
    }

    console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runDashboardTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
