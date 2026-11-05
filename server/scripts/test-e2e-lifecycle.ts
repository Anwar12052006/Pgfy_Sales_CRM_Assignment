import 'dotenv/config';
import http from 'node:http';
import app from '../src/app.js';
import { prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../src/config/prisma.js';

interface StepResult {
  step: string;
  expectedStatus: number;
  actualStatus: number;
  passed: boolean;
  details?: unknown;
}

const steps: StepResult[] = [];

function recordStep(step: string, expectedStatus: number, actualStatus: number, details?: unknown) {
  const passed = expectedStatus === actualStatus;
  steps.push({ step, expectedStatus, actualStatus, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${expectedStatus} === ${actualStatus}] ${step}`);
  if (!passed && details) {
    console.log('   Error details:', JSON.stringify(details, null, 2));
  }
}

async function makeRequest(
  port: number,
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
        port,
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

async function runE2ELifecycleTest() {
  console.log('============================================================');
  console.log('🚀 PGfy Sales CRM - End-to-End Customer Lifecycle Verification');
  console.log('============================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 5000;
  console.log(`Ephemeral test server listening on port ${port}...\n`);

  try {
    // ----------------------------------------------------
    // PREPARATION: Fetch baseline users
    // ----------------------------------------------------
    const adminUser = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
    const execUser = await prisma.user.findFirst({ where: { role: Role.EXECUTIVE, email: 'sales@pgfy.demo' } });
    const exec2User = await prisma.user.findFirst({ where: { role: Role.EXECUTIVE, email: 'ananya@pgfy.demo' } });

    if (!adminUser || !execUser) {
      throw new Error('Seed data missing demo admin or executive accounts. Run db:seed first.');
    }

    // ----------------------------------------------------
    // AUTHENTICATION: Login Admin & Executive
    // ----------------------------------------------------
    console.log('--- Step 0: Authentication & Role Verification ---');
    const adminLogin = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    recordStep('0.1 Admin login generates valid JWT', 200, adminLogin.status);
    const adminToken = adminLogin.body.data.token;

    const execLogin = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales@pgfy.demo',
      password: 'Sales@123',
    });
    recordStep('0.2 Executive login generates valid JWT', 200, execLogin.status);
    const execToken = execLogin.body.data.token;

    let exec2Token = '';
    if (exec2User) {
      const exec2Login = await makeRequest(port, '/api/auth/login', 'POST', {
        email: 'ananya@pgfy.demo',
        password: 'Sales@123',
      });
      exec2Token = exec2Login.body.data?.token || '';
      recordStep('0.3 Secondary executive login succeeds', 200, exec2Login.status);
    }

    // Fetch baseline performance for executive
    const baselinePerfRes = await makeRequest(port, '/api/dashboard/admin/performance', 'GET', undefined, adminToken);
    recordStep('0.4 Admin views baseline executive performance', 200, baselinePerfRes.status);
    const baselineExecPerf = baselinePerfRes.body.data.find((e: any) => e.executiveId === execUser.id);
    const initialConverted = baselineExecPerf ? baselineExecPerf.convertedLeads : 0;
    console.log(`   Baseline converted leads for ${execUser.name}: ${initialConverted}\n`);

    // ----------------------------------------------------
    // LIFECYCLE STEP 1: Admin Creates Lead
    // ----------------------------------------------------
    console.log('--- Step 1: Admin Creates Lead ---');
    const uniqueSuffix = Date.now().toString().slice(-6);
    const testLeadPayload = {
      customerName: `Vikramaditya Rao ${uniqueSuffix}`,
      mobileNumber: `9876${uniqueSuffix}`,
      email: `vikramaditya.${uniqueSuffix}@example.com`,
      preferredLocation: 'Koramangala',
      propertyCategory: '3 BHK',
      budget: 8500000,
      leadSource: 'PORTAL',
      notes: 'High-intent tech lead looking for 3 BHK in Koramangala 4th Block.',
    };

    const createLeadRes = await makeRequest(port, '/api/leads', 'POST', testLeadPayload, adminToken);
    recordStep('1.1 Admin successfully creates new unassigned lead', 201, createLeadRes.status, createLeadRes.body);
    const createdLeadId = createLeadRes.body.data.id;

    // Verify executive cannot assign lead
    const execAssignAttempt = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      { executiveId: execUser.id },
      execToken
    );
    recordStep('1.2 Security: Executive forbidden (HTTP 403) from assigning lead', 403, execAssignAttempt.status);

    // ----------------------------------------------------
    // LIFECYCLE STEP 2: Admin Assigns Lead
    // ----------------------------------------------------
    console.log('\n--- Step 2: Admin Assigns Lead to Executive ---');
    const assignRes = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assign`,
      'PATCH',
      { executiveId: execUser.id },
      adminToken
    );
    recordStep('2.1 Admin assigns lead to Sales Executive', 200, assignRes.status, assignRes.body);

    // Check assignment history
    const historyRes = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/assignments`,
      'GET',
      undefined,
      adminToken
    );
    recordStep('2.2 Admin views assignment history recording initial assignment', 200, historyRes.status);
    const historyEntries = historyRes.body.data?.assignments || historyRes.body.data || [];
    const hasActiveAssignment = historyEntries.some((a: any) => a.executiveId === execUser.id && a.unassignedAt === null);
    recordStep('2.3 Active assignment record exists for executive', true ? 200 : 500, hasActiveAssignment ? 200 : 500);

    // ----------------------------------------------------
    // LIFECYCLE STEP 3: Executive Views Lead
    // ----------------------------------------------------
    console.log('\n--- Step 3: Executive Views Lead ---');
    const execViewRes = await makeRequest(port, `/api/leads/${createdLeadId}`, 'GET', undefined, execToken);
    recordStep('3.1 Assigned executive can view lead details', 200, execViewRes.status, execViewRes.body);

    if (exec2Token) {
      const exec2ViewRes = await makeRequest(port, `/api/leads/${createdLeadId}`, 'GET', undefined, exec2Token);
      recordStep('3.2 Security: Unassigned executive forbidden (HTTP 403) from accessing another executive’s lead', 403, exec2ViewRes.status);
    }

    // ----------------------------------------------------
    // LIFECYCLE STEP 4: Executive Records Call
    // ----------------------------------------------------
    console.log('\n--- Step 4: Executive Records Call with Outcome ---');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(11, 0, 0, 0);

    const callPayload = {
      leadId: createdLeadId,
      callDateTime: new Date().toISOString(),
      durationSeconds: 240,
      outcome: CallOutcome.INTERESTED,
      notes: 'Customer is very interested, discussed 3 BHK units near Sony World signal.',
      nextFollowUpDate: tomorrow.toISOString(),
      nextFollowUpNotes: 'Follow up to schedule physical site visit on Saturday.',
    };

    const recordCallRes = await makeRequest(port, '/api/calls', 'POST', callPayload, execToken);
    recordStep('4.1 Executive logs outbound call and schedules follow-up atomically', 201, recordCallRes.status, recordCallRes.body);
    const callRecord = recordCallRes.body.data;
    const followUpRecord = callRecord?.followUps?.[0];

    // View call history for the lead
    const callHistoryRes = await makeRequest(port, `/api/calls/lead/${createdLeadId}`, 'GET', undefined, execToken);
    recordStep('4.2 Executive views lead call history containing new call', 200, callHistoryRes.status);
    const callsList = callHistoryRes.body.data?.calls || callHistoryRes.body.data || [];
    const containsNewCall = callsList.some((c: any) => c.id === callRecord?.id);
    recordStep('4.3 New call recorded in call timeline', true ? 200 : 500, containsNewCall ? 200 : 500);

    // ----------------------------------------------------
    // LIFECYCLE STEP 5: Executive Views & Reschedules Follow-up
    // ----------------------------------------------------
    console.log('\n--- Step 5: Executive Manages Follow-up (Reschedule) ---');
    const followUpId = followUpRecord?.id;
    if (!followUpId) {
      throw new Error('Follow-up ID missing from call record response');
    }

    const rescheduledDate = new Date();
    rescheduledDate.setDate(rescheduledDate.getDate() + 2);
    rescheduledDate.setHours(15, 30, 0, 0);

    const rescheduleRes = await makeRequest(
      port,
      `/api/followups/${followUpId}/reschedule`,
      'PATCH',
      {
        dueAt: rescheduledDate.toISOString(),
        notes: 'Customer requested afternoon call after office meetings.',
      },
      execToken
    );
    recordStep('5.1 Executive reschedules follow-up to new time', 200, rescheduleRes.status, rescheduleRes.body);

    // ----------------------------------------------------
    // LIFECYCLE STEP 6: Executive Completes Follow-up
    // ----------------------------------------------------
    console.log('\n--- Step 6: Executive Completes Follow-up ---');
    const completeRes = await makeRequest(
      port,
      `/api/followups/${followUpId}/status`,
      'PATCH',
      {
        status: FollowUpStatus.COMPLETED,
        notes: 'Site visit completed. Customer confirmed booking token.',
      },
      execToken
    );
    recordStep('6.1 Executive marks follow-up COMPLETED', 200, completeRes.status, completeRes.body);

    // Verify follow-up status in database
    const followUpDetailRes = await makeRequest(port, `/api/followups/${followUpId}`, 'GET', undefined, execToken);
    recordStep('6.2 Follow-up status updated to COMPLETED', 200, followUpDetailRes.status);
    recordStep('6.3 Follow-up verified COMPLETED', FollowUpStatus.COMPLETED === followUpDetailRes.body.data?.status ? 200 : 500, 200);

    // ----------------------------------------------------
    // LIFECYCLE STEP 7: Executive Converts Lead
    // ----------------------------------------------------
    console.log('\n--- Step 7: Executive Converts Lead ---');
    const convertRes = await makeRequest(
      port,
      `/api/leads/${createdLeadId}/status`,
      'PATCH',
      {
        status: LeadStatus.CONVERTED,
      },
      execToken
    );
    recordStep('7.1 Executive updates lead status to CONVERTED', 200, convertRes.status, convertRes.body);

    // ----------------------------------------------------
    // LIFECYCLE STEP 8: Admin Views Updated Performance Analytics
    // ----------------------------------------------------
    console.log('\n--- Step 8: Admin Views Updated Performance Analytics ---');
    const updatedAdminDashboard = await makeRequest(port, '/api/dashboard/admin', 'GET', undefined, adminToken);
    recordStep('8.1 Admin views overall dashboard metrics', 200, updatedAdminDashboard.status);

    const updatedPerfRes = await makeRequest(port, '/api/dashboard/admin/performance', 'GET', undefined, adminToken);
    recordStep('8.2 Admin views executive performance leaderboard', 200, updatedPerfRes.status);

    const updatedExecPerf = updatedPerfRes.body.data.find((e: any) => e.executiveId === execUser.id);
    const newConverted = updatedExecPerf ? updatedExecPerf.convertedLeads : 0;
    console.log(`   Updated converted leads for ${execUser.name}: ${newConverted} (Initial: ${initialConverted})`);
    recordStep('8.3 Executive convertedLeads metric accurately incremented by 1', initialConverted + 1 === newConverted ? 200 : 500, 200);

    // ----------------------------------------------------
    // SECURITY & REPORT ACCESS VERIFICATIONS
    // ----------------------------------------------------
    console.log('\n--- Step 9: Reports & Security Authorizations ---');
    const leadsReportRes = await makeRequest(port, '/api/reports/leads', 'GET', undefined, adminToken);
    recordStep('9.1 Admin successfully downloads All Leads CSV Report', 200, leadsReportRes.status);

    const callsReportRes = await makeRequest(port, '/api/reports/calls', 'GET', undefined, adminToken);
    recordStep('9.2 Admin successfully downloads Call History CSV Report', 200, callsReportRes.status);

    const perfReportRes = await makeRequest(port, '/api/reports/performance', 'GET', undefined, adminToken);
    recordStep('9.3 Admin successfully downloads Executive Performance CSV Report', 200, perfReportRes.status);

    const execReportForbidden = await makeRequest(port, '/api/reports/leads', 'GET', undefined, execToken);
    recordStep('9.4 Security: Executive strictly forbidden (HTTP 403) from downloading reports', 403, execReportForbidden.status);

    // Clean up test lead from database
    await prisma.followUp.deleteMany({ where: { leadId: createdLeadId } });
    await prisma.call.deleteMany({ where: { leadId: createdLeadId } });
    await prisma.leadAssignment.deleteMany({ where: { leadId: createdLeadId } });
    await prisma.lead.delete({ where: { id: createdLeadId } });
    console.log('\n🧹 Ephemeral lifecycle test records cleaned up from database.');

    // Summary
    const total = steps.length;
    const passedCount = steps.filter((s) => s.passed).length;
    const allPassed = passedCount === total;

    console.log('\n============================================================');
    console.log(`LIFECYCLE VERIFICATION SUMMARY: ${passedCount}/${total} assertions passed.`);
    if (allPassed) {
      console.log('🎉 COMPLETE 8-STAGE CUSTOMER LIFECYCLE FULLY VERIFIED ON POSTGRESQL!');
    } else {
      console.error(`❌ ${total - passedCount} ASSERTIONS FAILED.`);
    }
    console.log('============================================================\n');

    if (!allPassed) {
      process.exit(1);
    }
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runE2ELifecycleTest().catch((err) => {
  console.error('Fatal error during E2E lifecycle test:', err);
  process.exit(1);
});
