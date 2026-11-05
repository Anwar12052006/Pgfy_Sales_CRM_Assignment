import { authService } from '../src/services/auth.service.js';
import { reportService } from '../src/services/report.service.js';
import { generateCSV, sanitizeCSVValue } from '../src/utils/csv.js';
import app from '../src/app.js';
import http from 'http';
import fs from 'fs';
import path from 'path';

interface TestResponse {
  statusCode: number;
  headers: http.IncomingHttpHeaders;
  body: string;
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
        resolve({
          statusCode: res.statusCode || 500,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', reject);
    if (bodyData) {
      req.write(JSON.stringify(bodyData));
    }
    req.end();
  });
}

async function runReportTests() {
  console.log('🧪 Starting CSV Report Exports & RBAC Verification...\n');
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
    // 1. Authenticate Admin and Sales Executive
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

    // ==========================================
    // 1. UNAUTHENTICATED ACCESS CHECKS (401)
    // ==========================================
    console.log('🔒 Testing Unauthenticated Access Guards (HTTP 401)...');

    const unauthLeads = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/leads',
      method: 'GET',
    });
    assert(unauthLeads.statusCode === 401, 'Unauthenticated GET /api/reports/leads rejected with HTTP 401');

    const unauthCalls = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/calls',
      method: 'GET',
    });
    assert(unauthCalls.statusCode === 401, 'Unauthenticated GET /api/reports/calls rejected with HTTP 401');

    const unauthPerf = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/performance',
      method: 'GET',
    });
    assert(unauthPerf.statusCode === 401, 'Unauthenticated GET /api/reports/performance rejected with HTTP 401');

    // ==========================================
    // 2. EXECUTIVE FORBIDDEN CHECKS (HTTP 403)
    // ==========================================
    console.log('\n🔒 Testing Executive RBAC Forbidden Access (HTTP 403)...');

    const execLeads = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${execToken}` },
    });
    assert(execLeads.statusCode === 403, 'Sales Executive GET /api/reports/leads rejected with HTTP 403 Forbidden');

    const execCalls = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/calls',
      method: 'GET',
      headers: { Authorization: `Bearer ${execToken}` },
    });
    assert(execCalls.statusCode === 403, 'Sales Executive GET /api/reports/calls rejected with HTTP 403 Forbidden');

    const execPerf = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/performance',
      method: 'GET',
      headers: { Authorization: `Bearer ${execToken}` },
    });
    assert(execPerf.statusCode === 403, 'Sales Executive GET /api/reports/performance rejected with HTTP 403 Forbidden');

    // ==========================================
    // 3. ADMIN LEADS REPORT DOWNLOAD & COLUMNS
    // ==========================================
    console.log('\n📄 Testing Admin Leads CSV Report (GET /api/reports/leads)...');

    const adminLeadsRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/leads',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminLeadsRes.statusCode === 200, 'Admin accesses GET /api/reports/leads with HTTP 200 OK');

    const leadsContentType = adminLeadsRes.headers['content-type'] || '';
    assert(leadsContentType.includes('text/csv'), `Content-Type is text/csv (actual: ${leadsContentType})`);

    const leadsContentDisp = adminLeadsRes.headers['content-disposition'] || '';
    assert(
      leadsContentDisp.includes('attachment; filename="pgfy-leads-report-'),
      `Content-Disposition header sets attachment with leads filename (actual: ${leadsContentDisp})`
    );

    const leadsBody = adminLeadsRes.body;
    assert(leadsBody.charCodeAt(0) === 0xfeff, 'Leads CSV begins with UTF-8 BOM (\\uFEFF) for Excel compatibility');

    const leadsLines = leadsBody.slice(1).split('\r\n').filter((l) => l.trim().length > 0);
    const expectedLeadHeaders = [
      'Lead ID',
      'Customer Name',
      'Mobile Number',
      'Email',
      'Property Category',
      'Preferred Location',
      'Budget INR',
      'Lead Source',
      'Lead Status',
      'Assigned Executive Name',
      'Enquiry Date',
      'Created Date',
    ];
    assert(
      leadsLines[0] === expectedLeadHeaders.join(','),
      `Leads CSV header row contains all 12 required columns in order`
    );
    assert(leadsLines.length >= 21, `Leads CSV contains header plus at least 20 seeded data rows (found: ${leadsLines.length - 1} rows)`);

    // ==========================================
    // 4. ADMIN CALLS REPORT DOWNLOAD & COLUMNS
    // ==========================================
    console.log('\n📄 Testing Admin Calls CSV Report (GET /api/reports/calls)...');

    const adminCallsRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/calls',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminCallsRes.statusCode === 200, 'Admin accesses GET /api/reports/calls with HTTP 200 OK');

    const callsContentType = adminCallsRes.headers['content-type'] || '';
    assert(callsContentType.includes('text/csv'), `Content-Type is text/csv (actual: ${callsContentType})`);

    const callsContentDisp = adminCallsRes.headers['content-disposition'] || '';
    assert(
      callsContentDisp.includes('attachment; filename="pgfy-calls-report-'),
      `Content-Disposition header sets attachment with calls filename (actual: ${callsContentDisp})`
    );

    const callsBody = adminCallsRes.body;
    assert(callsBody.charCodeAt(0) === 0xfeff, 'Calls CSV begins with UTF-8 BOM (\\uFEFF) for Excel compatibility');

    const callsLines = callsBody.slice(1).split('\r\n').filter((l) => l.trim().length > 0);
    const expectedCallHeaders = [
      'Call ID',
      'Customer Name',
      'Customer Mobile',
      'Executive Name',
      'Call Date and Time',
      'Duration',
      'Call Outcome',
      'Call Notes',
      'Next Follow-up Date',
    ];
    assert(
      callsLines[0] === expectedCallHeaders.join(','),
      `Calls CSV header row contains all 9 required columns in order`
    );

    // ==========================================
    // 5. ADMIN PERFORMANCE REPORT DOWNLOAD & COLUMNS
    // ==========================================
    console.log('\n📄 Testing Admin Performance CSV Report (GET /api/reports/performance)...');

    const adminPerfRes = await makeRequest({
      hostname: 'localhost',
      port,
      path: '/api/reports/performance',
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminPerfRes.statusCode === 200, 'Admin accesses GET /api/reports/performance with HTTP 200 OK');

    const perfContentType = adminPerfRes.headers['content-type'] || '';
    assert(perfContentType.includes('text/csv'), `Content-Type is text/csv (actual: ${perfContentType})`);

    const perfContentDisp = adminPerfRes.headers['content-disposition'] || '';
    assert(
      perfContentDisp.includes('attachment; filename="pgfy-performance-report-'),
      `Content-Disposition header sets attachment with performance filename (actual: ${perfContentDisp})`
    );

    const perfBody = adminPerfRes.body;
    assert(perfBody.charCodeAt(0) === 0xfeff, 'Performance CSV begins with UTF-8 BOM (\\uFEFF)');

    const perfLines = perfBody.slice(1).split('\r\n').filter((l) => l.trim().length > 0);
    const expectedPerfHeaders = [
      'Executive Name',
      'Assigned Leads',
      'Unique Leads Contacted',
      'Converted Leads',
      'Total Calls',
      'Connected Calls',
      'Pending Follow-ups',
      'Overdue Follow-ups',
      'Call Coverage Rate',
      'Conversion Rate',
      'Connection Rate',
    ];
    assert(
      perfLines[0] === expectedPerfHeaders.join(','),
      `Performance CSV header row contains all 11 required columns in order`
    );
    assert(perfLines.length >= 3, `Performance CSV contains header plus at least 2 active executive rows (found: ${perfLines.length - 1} rows)`);

    // ==========================================
    // 6. SPREADSHEET FORMULA INJECTION & SPECIAL CHAR ESCAPING
    // ==========================================
    console.log('\n🛡️ Testing CSV Security: Formula Injection & Special Char Escaping...');

    // Test formula triggers: =, +, -, @, \t, \r
    const formulaPayloads = [
      '=cmd|\' /C calc\'!A0',
      '+1234567890',
      '-2+3',
      '@SUM(A1:A10)',
      '\tTabInjected',
    ];

    for (const payload of formulaPayloads) {
      const sanitized = sanitizeCSVValue(payload);
      assert(
        sanitized.startsWith("'") || sanitized.startsWith('"\''),
        `Formula injection neutralized: "${payload.replace('\t', '\\t')}" neutralized with leading quote`
      );
    }

    // Test special characters: Commas, quotes, newlines
    const textWithComma = 'Bengaluru, Karnataka';
    assert(sanitizeCSVValue(textWithComma) === '"Bengaluru, Karnataka"', 'Text with commas correctly quoted');

    const textWithQuotes = 'Property "Royal Oak" PG';
    assert(sanitizeCSVValue(textWithQuotes) === '"Property ""Royal Oak"" PG"', 'Text with internal quotes properly escaped as double quotes');

    const textWithNewline = 'Notes:\nLine 1\nLine 2';
    assert(sanitizeCSVValue(textWithNewline) === '"Notes:\nLine 1\nLine 2"', 'Text with newlines correctly quoted according to RFC 4180');

    // Test Empty Report returns valid headers only
    const emptyCSV = generateCSV([{ header: 'Col1', accessor: (r: any) => r.val }, { header: 'Col2', accessor: (r: any) => r.val }], []);
    assert(emptyCSV === '\uFEFFCol1,Col2\r\n', 'Empty dataset returns valid UTF-8 BOM + CSV headers without corruption');

    // ==========================================
    // 7. GENERATE SAMPLE EXPORTS IN sample-exports/
    // ==========================================
    console.log('\n💾 Generating sample exports in sample-exports/...');

    const sampleDir = path.resolve(process.cwd(), '../sample-exports');
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }

    const leadsCSV = await reportService.exportLeadsCSV();
    const callsCSV = await reportService.exportCallsCSV();
    const perfCSV = await reportService.exportPerformanceCSV();

    fs.writeFileSync(path.join(sampleDir, 'all-leads.csv'), leadsCSV, 'utf-8');
    fs.writeFileSync(path.join(sampleDir, 'call-history.csv'), callsCSV, 'utf-8');
    fs.writeFileSync(path.join(sampleDir, 'executive-performance.csv'), perfCSV, 'utf-8');

    assert(fs.existsSync(path.join(sampleDir, 'all-leads.csv')), 'Sample export sample-exports/all-leads.csv written');
    assert(fs.existsSync(path.join(sampleDir, 'call-history.csv')), 'Sample export sample-exports/call-history.csv written');
    assert(fs.existsSync(path.join(sampleDir, 'executive-performance.csv')), 'Sample export sample-exports/executive-performance.csv written');

    console.log(`\n📊 Test Summary: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runReportTests().catch((err) => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
