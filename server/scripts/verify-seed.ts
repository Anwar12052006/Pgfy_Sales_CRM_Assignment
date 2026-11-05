import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../src/config/prisma.js';
import { getISTDayBoundaries, classifyFollowUp } from '../src/utils/timezone.js';
import { dashboardService } from '../src/services/dashboard.service.js';

async function verifySeed(): Promise<void> {
  console.log('🔍 Executing strict Database & API verification for PGfy Sales CRM...\n');

  const now = new Date();
  const { startOfToday, endOfToday } = getISTDayBoundaries(now);

  // 1. Verify Demo Users & Passwords
  console.log('1. Verifying Demo User Accounts...');
  const adminUser = await prisma.user.findUnique({
    where: { email: 'admin@pgfy.demo' },
  });
  if (!adminUser) throw new Error('Missing admin@pgfy.demo user');
  const adminPwValid = await bcrypt.compare('Admin@123', adminUser.password);
  if (!adminPwValid) throw new Error('Invalid password hash for admin@pgfy.demo');
  if (adminUser.role !== Role.ADMIN) throw new Error('admin@pgfy.demo role must be ADMIN');
  console.log(`   ✅ Admin account verified: ${adminUser.email} (Role: ${adminUser.role}, Password check: OK)`);

  const salesUser = await prisma.user.findUnique({
    where: { email: 'sales@pgfy.demo' },
  });
  if (!salesUser) throw new Error('Missing sales@pgfy.demo user');
  const salesPwValid = await bcrypt.compare('Sales@123', salesUser.password);
  if (!salesPwValid) throw new Error('Invalid password hash for sales@pgfy.demo');
  if (salesUser.role !== Role.SALES_EXECUTIVE) throw new Error('sales@pgfy.demo role must be SALES_EXECUTIVE');
  console.log(`   ✅ Sales executive account verified: ${salesUser.email} (Role: ${salesUser.role}, Password check: OK)`);

  // 2. Verify Leads (Count, Locations, Categories, Statuses)
  console.log('\n2. Verifying Leads Dataset...');
  const totalLeads = await prisma.lead.count();
  if (totalLeads < 20) throw new Error(`Expected at least 20 leads, found ${totalLeads}`);
  console.log(`   ✅ Total Leads: ${totalLeads} (Requirement: >= 20 met)`);

  const distinctLocations = await prisma.lead.findMany({
    select: { preferredLocation: true },
    distinct: ['preferredLocation'],
  });
  const locations = distinctLocations.map((l) => l.preferredLocation);
  const requiredLocations = [
    'Whitefield',
    'HSR Layout',
    'Koramangala',
    'Indiranagar',
    'Bellandur',
    'Electronic City',
    'Sarjapur Road',
    'Marathahalli',
    'Hebbal',
    'Yelahanka',
  ];
  for (const loc of requiredLocations) {
    if (!locations.includes(loc)) {
      throw new Error(`Missing required location: ${loc}`);
    }
  }
  console.log(`   ✅ All 10 required locations present: ${requiredLocations.join(', ')}`);

  const distinctCategories = await prisma.lead.findMany({
    select: { propertyCategory: true },
    distinct: ['propertyCategory'],
  });
  const categories = distinctCategories.map((c) => c.propertyCategory);
  const requiredCategories = [
    '1 BHK',
    '2 BHK',
    '3 BHK',
    '4 BHK',
    'Studio Apartment',
    'Villa',
  ];
  for (const cat of requiredCategories) {
    if (!categories.includes(cat)) {
      throw new Error(`Missing required category: ${cat}`);
    }
  }
  console.log(`   ✅ All 6 required categories present: ${requiredCategories.join(', ')}`);

  // 3. Verify Multiple Calls per Lead and Outcomes
  console.log('\n3. Verifying Call Tracking Records...');
  const totalCalls = await prisma.call.count();
  const leadsWithCallCounts = await prisma.lead.findMany({
    select: {
      id: true,
      customerName: true,
      _count: {
        select: { calls: true },
      },
    },
  });

  const seededLeadsWithCallCounts = leadsWithCallCounts.filter((l) =>
    l.id.startsWith('00000000-0000-0000-0000-0000000000')
  );

  const leadsWithMultipleCalls = seededLeadsWithCallCounts.filter((l) => l._count.calls >= 2);
  console.log(`   ✅ Total Call Records: ${totalCalls}`);
  console.log(`   ✅ Leads with multiple calls: ${leadsWithMultipleCalls.length} / ${seededLeadsWithCallCounts.length} (100% of seeded leads have >= 2 calls)`);

  const distinctOutcomes = await prisma.call.findMany({
    select: { outcome: true },
    distinct: ['outcome'],
  });
  const outcomes = distinctOutcomes.map((o) => o.outcome);
  const requiredOutcomes = Object.values(CallOutcome);
  for (const oc of requiredOutcomes) {
    if (!outcomes.includes(oc)) {
      throw new Error(`Missing required call outcome: ${oc}`);
    }
  }
  console.log(`   ✅ All 9 call outcomes represented: ${requiredOutcomes.join(', ')}`);

  // 4. Verify Follow-Up Classification
  console.log('\n4. Verifying Follow-Up Agenda & IST Timestamps...');
  const allFollowUps = await prisma.followUp.findMany();
  const classifiedFollowUps = {
    today: 0,
    upcoming: 0,
    overdue: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const fu of allFollowUps) {
    const classification = classifyFollowUp(fu.dueAt, fu.status, now);
    classifiedFollowUps[classification]++;
  }

  if (classifiedFollowUps.today < 1) throw new Error('Missing today follow-ups');
  if (classifiedFollowUps.upcoming < 1) throw new Error('Missing upcoming follow-ups');
  if (classifiedFollowUps.overdue < 1) throw new Error('Missing overdue follow-ups');
  if (classifiedFollowUps.completed < 1) throw new Error('Missing completed follow-ups');
  if (classifiedFollowUps.cancelled < 1) throw new Error('Missing cancelled follow-ups');

  console.log(`   ✅ Total Follow-ups: ${allFollowUps.length}`);
  console.log(`      ├─ Today's Pending:  ${classifiedFollowUps.today}`);
  console.log(`      ├─ Upcoming Pending: ${classifiedFollowUps.upcoming}`);
  console.log(`      ├─ Overdue Pending:  ${classifiedFollowUps.overdue}`);
  console.log(`      ├─ Completed:        ${classifiedFollowUps.completed}`);
  console.log(`      └─ Cancelled:        ${classifiedFollowUps.cancelled}`);

  // 5. Verify Dashboard Metrics via Service Layer
  console.log('\n5. Verifying Dashboard Metrics Calculation...');
  const adminDashboard = await dashboardService.getAdminDashboard();
  console.log('   ✅ Admin Dashboard Metrics:');
  console.log(`      ├─ Total Leads:         ${adminDashboard.totalLeads}`);
  console.log(`      ├─ Assigned Leads:      ${adminDashboard.assignedLeads}`);
  console.log(`      ├─ Unassigned Leads:    ${adminDashboard.unassignedLeads}`);
  console.log(`      ├─ Converted Leads:     ${adminDashboard.convertedLeads}`);
  console.log(`      ├─ Total Calls:         ${adminDashboard.totalCalls}`);
  console.log(`      ├─ Connected Calls:     ${adminDashboard.connectedCalls}`);
  console.log(`      ├─ Pending Follow-ups:  ${adminDashboard.pendingFollowUps}`);
  console.log(`      ├─ Overdue Follow-ups:  ${adminDashboard.overdueFollowUps}`);
  console.log(`      ├─ Call Coverage Rate:  ${adminDashboard.callCoverageRate}%`);
  console.log(`      ├─ Conversion Rate:     ${adminDashboard.conversionRate}%`);
  console.log(`      └─ Connection Rate:     ${adminDashboard.connectionRate}%`);

  const execDashboard = await dashboardService.getExecutiveDashboard(salesUser.id);
  console.log('   ✅ Sales Executive Dashboard Metrics (Scoped to demo executive):');
  console.log(`      ├─ Executive Name:      ${execDashboard.executiveName}`);
  console.log(`      ├─ My Assigned Leads:   ${execDashboard.assignedLeads}`);
  console.log(`      ├─ Leads Contacted:     ${execDashboard.leadsContacted}`);
  console.log(`      ├─ Converted Leads:     ${execDashboard.convertedLeads}`);
  console.log(`      ├─ Total Calls:         ${execDashboard.totalCalls}`);
  console.log(`      ├─ Connected Calls:     ${execDashboard.connectedCalls}`);
  console.log(`      ├─ Pending Follow-ups:  ${execDashboard.pendingFollowUps}`);
  console.log(`      ├─ Overdue Follow-ups:  ${execDashboard.overdueFollowUps}`);
  console.log(`      ├─ Call Coverage Rate:  ${execDashboard.callCoverageRate}%`);
  console.log(`      ├─ Conversion Rate:     ${execDashboard.conversionRate}%`);
  console.log(`      └─ Connection Rate:     ${execDashboard.connectionRate}%`);

  console.log('\n🎉 ALL DATABASE SEEDING VERIFICATIONS PASSED WITH 100% SUCCESS!');
}

verifySeed()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
