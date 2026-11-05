import 'dotenv/config';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { config } from '../src/config/index.js';
import { prisma } from '../src/config/prisma.js';

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

function recordTest(name: string, expectedStatus: number, actualStatus: number, extraCondition = true, details?: unknown) {
  const passed = actualStatus === expectedStatus && extraCondition;
  results.push({ name, expectedStatus, actualStatus, passed, details });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} [${actualStatus === expectedStatus ? actualStatus : `${actualStatus} (expected ${expectedStatus})`}] ${name}`);
  if (!passed && details) {
    console.error('   Details:', details);
  }
}

async function runTestSuite() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING PGFY SALES CRM AUTH & RBAC VERIFICATION SUITE');
  console.log('============================================================\n');

  // Start test server on random high port
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;

  try {
    let adminToken = '';
    let exec1Token = '';
    let exec2Token = '';

    // Test 1: Zod validation failure on invalid email
    const res1 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'not-an-email',
      password: 'password123',
    });
    recordTest('1. Zod validation rejects malformed email with HTTP 400', 400, res1.status, res1.body.success === false);

    // Test 2: Non-existent user login rejection
    const res2 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'nobody@pgfy.demo',
      password: 'SomePassword@123',
    });
    recordTest('2. Reject non-existent user with HTTP 401', 401, res2.status, res2.body.success === false);

    // Test 3: Incorrect password rejection
    const res3 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'WrongPassword@999',
    });
    recordTest('3. Reject incorrect password with HTTP 401', 401, res3.status, res3.body.success === false);

    // Test 4: Inactive account rejection
    const res4 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'inactive@pgfy.demo',
      password: 'Inactive@123',
    });
    recordTest('4. Reject inactive/deactivated account with HTTP 401', 401, res4.status, res4.body.message.includes('deactivated'));

    // Test 5: Correct Admin login
    const res5 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'admin@pgfy.demo',
      password: 'Admin@123',
    });
    const hasNoPassword = res5.body.data?.user?.password === undefined;
    adminToken = res5.body.data?.token || '';
    recordTest(
      '5. Admin login succeeds with HTTP 200, JWT returned and password omitted',
      200,
      res5.status,
      hasNoPassword && res5.body.data?.user?.role === 'ADMIN' && !!adminToken
    );

    // Test 6: Correct Sales Executive 1 login
    const res6 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales@pgfy.demo',
      password: 'Sales@123',
    });
    exec1Token = res6.body.data?.token || '';
    recordTest(
      '6. Sales Executive login succeeds with HTTP 200 and role SALES_EXECUTIVE',
      200,
      res6.status,
      res6.body.data?.user?.role === 'SALES_EXECUTIVE' && !!exec1Token
    );

    // Test 7: Correct Sales Executive 2 login
    const res7 = await makeRequest(port, '/api/auth/login', 'POST', {
      email: 'sales2@pgfy.demo',
      password: 'Sales2@123',
    });
    exec2Token = res7.body.data?.token || '';
    recordTest('7. Sales Executive 2 login succeeds with HTTP 200', 200, res7.status, !!exec2Token);

    // Test 8: GET /api/auth/me with valid token
    const res8 = await makeRequest(port, '/api/auth/me', 'GET', undefined, adminToken);
    recordTest(
      '8. GET /api/auth/me returns profile matching token identity',
      200,
      res8.status,
      res8.body.data?.email === 'admin@pgfy.demo' && res8.body.data?.password === undefined
    );

    // Test 9: GET /api/auth/me with missing token returns 401
    const res9 = await makeRequest(port, '/api/auth/me', 'GET');
    recordTest('9. GET /api/auth/me with missing token returns HTTP 401', 401, res9.status);

    // Test 10: GET /api/auth/me with invalid JWT returns 401
    const res10 = await makeRequest(port, '/api/auth/me', 'GET', undefined, 'invalid.jwt.signature');
    recordTest('10. GET /api/auth/me with bogus JWT returns HTTP 401', 401, res10.status);

    // Test 10b: GET /api/auth/me with expired JWT returns 401
    const expiredToken = jwt.sign({ id: '00000000-0000-0000-0000-000000000001', role: 'ADMIN' }, config.JWT_SECRET, { expiresIn: -10 });
    const res10b = await makeRequest(port, '/api/auth/me', 'GET', undefined, expiredToken);
    recordTest('10b. GET /api/auth/me with expired JWT rejected with HTTP 401', 401, res10b.status, res10b.body.message?.includes('expired'));

    // Test 10c: POST /api/auth/logout with valid token returns 200
    const res10c = await makeRequest(port, '/api/auth/logout', 'POST', undefined, adminToken);
    recordTest('10c. POST /api/auth/logout returns HTTP 200', 200, res10c.status, res10c.body.success === true);

    // Test 11: Admin accesses admin route (GET /api/admin/dashboard)
    const res11 = await makeRequest(port, '/api/admin/dashboard', 'GET', undefined, adminToken);
    recordTest(
      '11. Admin successfully accesses /api/admin/dashboard with HTTP 200',
      200,
      res11.status,
      res11.body.success === true
    );

    // Test 12: Sales Executive receives 403 on admin route
    const res12 = await makeRequest(port, '/api/admin/dashboard', 'GET', undefined, exec1Token);
    recordTest(
      '12. Sales Executive receives HTTP 403 Forbidden on /api/admin/dashboard',
      403,
      res12.status,
      res12.body.success === false
    );

    // Test 13: Executive 1 accesses their own assigned lead (Lead 1)
    const lead1Id = '00000000-0000-0000-0000-000000000001';
    const res13 = await makeRequest(port, `/api/executive/leads/${lead1Id}`, 'GET', undefined, exec1Token);
    recordTest(
      '13. Sales Executive 1 accesses their own assigned lead with HTTP 200',
      200,
      res13.status,
      res13.body.data?.customerName === 'Aarav Patel'
    );

    // Test 14: Executive 1 attempts to access Executive 2's assigned lead (Lead 2) -> MUST BE 403
    const lead2Id = '00000000-0000-0000-0000-000000000002';
    const res14 = await makeRequest(port, `/api/executive/leads/${lead2Id}`, 'GET', undefined, exec1Token);
    recordTest(
      "14. Sales Executive 1 is FORBIDDEN (HTTP 403) from accessing Executive 2's lead (Lead Isolation / IDOR Protection)",
      403,
      res14.status,
      res14.body.success === false
    );

    // Test 15: Executive 2 accesses their own assigned lead (Lead 2) -> 200 OK
    const res15 = await makeRequest(port, `/api/executive/leads/${lead2Id}`, 'GET', undefined, exec2Token);
    recordTest(
      '15. Sales Executive 2 accesses their own assigned lead with HTTP 200',
      200,
      res15.status,
      res15.body.data?.customerName === 'Ananya Iyer'
    );

    // Summary
    const total = results.length;
    const passedCount = results.filter((r) => r.passed).length;
    const allPassed = passedCount === total;

    console.log('\n------------------------------------------------------------');
    console.log(`TEST SUMMARY: ${passedCount}/${total} tests passed.`);
    if (allPassed) {
      console.log('🎉 ALL AUTHENTICATION AND RBAC TESTS PASSED SUCCESSFULLY!');
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

runTestSuite().catch((err) => {
  console.error('Fatal test execution error:', err);
  process.exit(1);
});
