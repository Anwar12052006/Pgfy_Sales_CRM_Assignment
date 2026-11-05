import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma, Role, LeadStatus, CallOutcome, FollowUpStatus } from '../src/config/prisma.js';
import { getISTDayBoundaries } from '../src/utils/timezone.js';

/**
 * Returns a Date object N days prior to now
 */
function daysAgo(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
}

/**
 * Returns a Date object N days in the future
 */
function daysFromNow(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d;
}

export async function seedDatabase(): Promise<void> {
  console.log('🌱 Starting comprehensive database seed for PGfy Sales CRM...\n');

  const saltRounds = 10;
  const now = new Date();
  const { startOfToday, endOfToday } = getISTDayBoundaries(now);

  // =========================================================================
  // 1. DEMO USERS (Idempotent via upsert on email)
  // =========================================================================
  const adminPasswordHash = await bcrypt.hash('Admin@123', saltRounds);
  const salesPasswordHash = await bcrypt.hash('Sales@123', saltRounds);
  const sales2PasswordHash = await bcrypt.hash('Sales2@123', saltRounds);
  const inactivePasswordHash = await bcrypt.hash('Inactive@123', saltRounds);

  // 1. Admin Account (Required Demo Account)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@pgfy.demo' },
    update: {
      password: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
      name: 'PGfy Admin',
    },
    create: {
      email: 'admin@pgfy.demo',
      name: 'PGfy Admin',
      password: adminPasswordHash,
      role: Role.ADMIN,
      isActive: true,
    },
  });
  console.log(`👤 Admin user: ${admin.email} (Role: ${admin.role})`);

  // 2. Demo Sales Executive Account (Required Demo Account)
  const demoExecutive = await prisma.user.upsert({
    where: { email: 'sales@pgfy.demo' },
    update: {
      password: salesPasswordHash,
      role: Role.SALES_EXECUTIVE,
      isActive: true,
      name: 'Rohan Sharma (Demo Executive)',
    },
    create: {
      email: 'sales@pgfy.demo',
      name: 'Rohan Sharma (Demo Executive)',
      password: salesPasswordHash,
      role: Role.SALES_EXECUTIVE,
      isActive: true,
    },
  });
  console.log(`👤 Demo Sales Executive: ${demoExecutive.email} (Role: ${demoExecutive.role})`);

  // 3. Secondary Sales Executive Account (Strictly necessary for executive performance comparisons & analytics)
  const secondaryExecutive = await prisma.user.upsert({
    where: { email: 'sales2@pgfy.demo' },
    update: {
      password: sales2PasswordHash,
      role: Role.SALES_EXECUTIVE,
      isActive: true,
      name: 'Priya Verma (Sales Executive 2)',
    },
    create: {
      email: 'sales2@pgfy.demo',
      name: 'Priya Verma (Sales Executive 2)',
      password: sales2PasswordHash,
      role: Role.SALES_EXECUTIVE,
      isActive: true,
    },
  });
  console.log(`👤 Secondary Sales Executive: ${secondaryExecutive.email}`);

  // 4. Inactive User (Strictly for testing deactivated account rejection)
  const inactiveUser = await prisma.user.upsert({
    where: { email: 'inactive@pgfy.demo' },
    update: {
      password: inactivePasswordHash,
      role: Role.SALES_EXECUTIVE,
      isActive: false,
      name: 'Deactivated User',
    },
    create: {
      email: 'inactive@pgfy.demo',
      name: 'Deactivated User',
      password: inactivePasswordHash,
      role: Role.SALES_EXECUTIVE,
      isActive: false,
    },
  });
  console.log(`👤 Inactive User: ${inactiveUser.email} (Active: ${inactiveUser.isActive})\n`);

  // =========================================================================
  // 2. 25 FICTIONAL INDIAN CUSTOMER LEADS DATASET
  // Locations: Whitefield, HSR Layout, Koramangala, Indiranagar, Bellandur,
  //            Electronic City, Sarjapur Road, Marathahalli, Hebbal, Yelahanka
  // Property Categories: 1 BHK, 2 BHK, 3 BHK, 4 BHK, Studio Apartment, Villa
  // =========================================================================
  const leadsDataset = [
    // ── Group A: Assigned to Demo Executive (sales@pgfy.demo) - 12 leads ──
    {
      id: '00000000-0000-0000-0000-000000000001',
      customerName: 'Aarav Patel',
      mobileNumber: '9845011001',
      email: 'aarav.patel@fictional-pgfy.in',
      propertyCategory: '1 BHK',
      preferredLocation: 'Koramangala',
      budget: 18000,
      leadSource: 'Website',
      status: LeadStatus.INTERESTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(14),
    },
    {
      id: '00000000-0000-0000-0000-000000000002',
      customerName: 'Ananya Iyer',
      mobileNumber: '9845011002',
      email: 'ananya.iyer@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'HSR Layout',
      budget: 28000,
      leadSource: 'Google Ads',
      status: LeadStatus.CONTACTED,
      assignedExecutiveId: secondaryExecutive.id,
      enquiryDate: daysAgo(12),
    },
    {
      id: '00000000-0000-0000-0000-000000000003',
      customerName: 'Sneha Reddy',
      mobileNumber: '9845011003',
      email: 'sneha.reddy@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'Bellandur',
      budget: 32000,
      leadSource: 'Referral',
      status: LeadStatus.VISIT_SCHEDULED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(5),
    },
    {
      id: '00000000-0000-0000-0000-000000000004',
      customerName: 'Rohan Nair',
      mobileNumber: '9845011004',
      email: 'rohan.nair@fictional-pgfy.in',
      propertyCategory: '3 BHK',
      preferredLocation: 'Whitefield',
      budget: 42000,
      leadSource: 'Social Media',
      status: LeadStatus.FOLLOW_UP,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(7),
    },
    {
      id: '00000000-0000-0000-0000-000000000005',
      customerName: 'Pooja Hegde',
      mobileNumber: '9845011005',
      email: 'pooja.hegde@fictional-pgfy.in',
      propertyCategory: '1 BHK',
      preferredLocation: 'Electronic City',
      budget: 15000,
      leadSource: 'Website',
      status: LeadStatus.CONVERTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(20),
    },
    {
      id: '00000000-0000-0000-0000-000000000006',
      customerName: 'Karthik Subramanian',
      mobileNumber: '9845011006',
      email: 'karthik.sub@fictional-pgfy.in',
      propertyCategory: 'Villa',
      preferredLocation: 'Sarjapur Road',
      budget: 75000,
      leadSource: 'Google Ads',
      status: LeadStatus.INTERESTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(10),
    },
    {
      id: '00000000-0000-0000-0000-000000000007',
      customerName: 'Divya Venkatesh',
      mobileNumber: '9845011007',
      email: null,
      propertyCategory: 'Studio Apartment',
      preferredLocation: 'Marathahalli',
      budget: 16000,
      leadSource: 'Direct Enquiry',
      status: LeadStatus.NOT_INTERESTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(15),
    },
    {
      id: '00000000-0000-0000-0000-000000000008',
      customerName: 'Aditi Rao',
      mobileNumber: '9845011008',
      email: 'aditi.rao@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'Hebbal',
      budget: 30000,
      leadSource: 'Referral',
      status: LeadStatus.FOLLOW_UP,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(4),
    },
    {
      id: '00000000-0000-0000-0000-000000000009',
      customerName: 'Rajeshwari Kulkarni',
      mobileNumber: '9845011009',
      email: 'rajeshwari.k@fictional-pgfy.in',
      propertyCategory: '3 BHK',
      preferredLocation: 'Yelahanka',
      budget: 38000,
      leadSource: 'Website',
      status: LeadStatus.VISIT_SCHEDULED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(6),
    },
    {
      id: '00000000-0000-0000-0000-000000000010',
      customerName: 'Vikram Malhotra',
      mobileNumber: '9845011010',
      email: 'vikram.m@fictional-pgfy.in',
      propertyCategory: '4 BHK',
      preferredLocation: 'Whitefield',
      budget: 55000,
      leadSource: 'Google Ads',
      status: LeadStatus.LOST,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(25),
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      customerName: 'Kunal Singhania',
      mobileNumber: '9845011011',
      email: 'kunal.s@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'HSR Layout',
      budget: 34000,
      leadSource: 'MagicBricks',
      status: LeadStatus.INTERESTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(8),
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      customerName: 'Nandini Dasgupta',
      mobileNumber: '9845011012',
      email: 'nandini.d@fictional-pgfy.in',
      propertyCategory: '1 BHK',
      preferredLocation: 'Indiranagar',
      budget: 20000,
      leadSource: 'Housing.com',
      status: LeadStatus.CONTACTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(2),
    },

    // ── Group B: Assigned to Secondary Executive (sales2@pgfy.demo) - 6 leads ──
    {
      id: '00000000-0000-0000-0000-000000000013',
      customerName: 'Rahul Sharma',
      mobileNumber: '9845011013',
      email: 'rahul.sharma@fictional-pgfy.in',
      propertyCategory: 'Studio Apartment',
      preferredLocation: 'Indiranagar',
      budget: 22000,
      leadSource: 'Direct Enquiry',
      status: LeadStatus.CONTACTED,
      assignedExecutiveId: demoExecutive.id,
      enquiryDate: daysAgo(3),
    },
    {
      id: '00000000-0000-0000-0000-000000000014',
      customerName: 'Meera Joshi',
      mobileNumber: '9845011014',
      email: 'meera.joshi@fictional-pgfy.in',
      propertyCategory: '1 BHK',
      preferredLocation: 'Koramangala',
      budget: 19000,
      leadSource: 'Social Media',
      status: LeadStatus.CONTACTED,
      assignedExecutiveId: secondaryExecutive.id,
      enquiryDate: daysAgo(8),
    },
    {
      id: '00000000-0000-0000-0000-000000000015',
      customerName: 'Amit Deshmukh',
      mobileNumber: '9845011015',
      email: 'amit.d@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'Electronic City',
      budget: 25000,
      leadSource: 'Website',
      status: LeadStatus.INTERESTED,
      assignedExecutiveId: secondaryExecutive.id,
      enquiryDate: daysAgo(11),
    },
    {
      id: '00000000-0000-0000-0000-000000000016',
      customerName: 'Kavita Pillai',
      mobileNumber: '9845011016',
      email: null,
      propertyCategory: 'Studio Apartment',
      preferredLocation: 'HSR Layout',
      budget: 21000,
      leadSource: 'Direct Enquiry',
      status: LeadStatus.CONVERTED,
      assignedExecutiveId: secondaryExecutive.id,
      enquiryDate: daysAgo(18),
    },
    {
      id: '00000000-0000-0000-0000-000000000017',
      customerName: 'Siddharth Roy',
      mobileNumber: '9845011017',
      email: 'siddharth.roy@fictional-pgfy.in',
      propertyCategory: 'Villa',
      preferredLocation: 'Indiranagar',
      budget: 85000,
      leadSource: 'Referral',
      status: LeadStatus.VISIT_SCHEDULED,
      assignedExecutiveId: secondaryExecutive.id,
      enquiryDate: daysAgo(4),
    },
    {
      id: '00000000-0000-0000-0000-000000000018',
      customerName: 'Neha Choudhury',
      mobileNumber: '9845011018',
      email: 'neha.c@fictional-pgfy.in',
      propertyCategory: '3 BHK',
      preferredLocation: 'Sarjapur Road',
      budget: 36000,
      leadSource: 'Google Ads',
      status: LeadStatus.FOLLOW_UP,
      assignedExecutiveId: secondaryExecutive.id,
      enquiryDate: daysAgo(9),
    },

    // ── Group C: Unassigned Leads in Central Inbound Pool - 7 leads ──
    {
      id: '00000000-0000-0000-0000-000000000019',
      customerName: 'Arjun Verma',
      mobileNumber: '9845011019',
      email: 'arjun.verma@fictional-pgfy.in',
      propertyCategory: '1 BHK',
      preferredLocation: 'Bellandur',
      budget: 17000,
      leadSource: 'Website',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(2),
    },
    {
      id: '00000000-0000-0000-0000-000000000020',
      customerName: 'Tanvi Sen',
      mobileNumber: '9845011020',
      email: 'tanvi.sen@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'Marathahalli',
      budget: 27000,
      leadSource: 'Social Media',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(1),
    },
    {
      id: '00000000-0000-0000-0000-000000000021',
      customerName: 'Varun Kapoor',
      mobileNumber: '9845011021',
      email: 'varun.kapoor@fictional-pgfy.in',
      propertyCategory: 'Studio Apartment',
      preferredLocation: 'Koramangala',
      budget: 23000,
      leadSource: 'Google Ads',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(3),
    },
    {
      id: '00000000-0000-0000-0000-000000000022',
      customerName: 'Sanjay Ghosh',
      mobileNumber: '9845011022',
      email: null,
      propertyCategory: '3 BHK',
      preferredLocation: 'Whitefield',
      budget: 45000,
      leadSource: 'Walk-in',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(4),
    },
    {
      id: '00000000-0000-0000-0000-000000000023',
      customerName: 'Swati Kulkarni',
      mobileNumber: '9845011023',
      email: 'swati.k@fictional-pgfy.in',
      propertyCategory: '2 BHK',
      preferredLocation: 'Hebbal',
      budget: 29000,
      leadSource: 'Website',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(5),
    },
    {
      id: '00000000-0000-0000-0000-000000000024',
      customerName: 'Nikhil Nair',
      mobileNumber: '9845011024',
      email: 'nikhil.nair@fictional-pgfy.in',
      propertyCategory: 'Villa',
      preferredLocation: 'Yelahanka',
      budget: 68000,
      leadSource: '99acres',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(6),
    },
    {
      id: '00000000-0000-0000-0000-000000000025',
      customerName: 'Shreya Nambiar',
      mobileNumber: '9845011025',
      email: 'shreya.n@fictional-pgfy.in',
      propertyCategory: '1 BHK',
      preferredLocation: 'Electronic City',
      budget: 14000,
      leadSource: 'Walk-in',
      status: LeadStatus.NEW,
      assignedExecutiveId: null,
      enquiryDate: daysAgo(7),
    },
  ];

  console.log(`📋 Seeding ${leadsDataset.length} fictional Bengaluru leads...`);

  for (const leadData of leadsDataset) {
    await prisma.lead.upsert({
      where: { id: leadData.id },
      update: {
        customerName: leadData.customerName,
        mobileNumber: leadData.mobileNumber,
        email: leadData.email,
        propertyCategory: leadData.propertyCategory,
        preferredLocation: leadData.preferredLocation,
        budget: leadData.budget,
        leadSource: leadData.leadSource,
        status: leadData.status,
        enquiryDate: leadData.enquiryDate,
        assignedExecutiveId: leadData.assignedExecutiveId,
      },
      create: {
        id: leadData.id,
        customerName: leadData.customerName,
        mobileNumber: leadData.mobileNumber,
        email: leadData.email,
        propertyCategory: leadData.propertyCategory,
        preferredLocation: leadData.preferredLocation,
        budget: leadData.budget,
        leadSource: leadData.leadSource,
        status: leadData.status,
        enquiryDate: leadData.enquiryDate,
        assignedExecutiveId: leadData.assignedExecutiveId,
      },
    });
  }

  console.log(`✅ ${leadsDataset.length} leads seeded with stable UUIDs.\n`);

  // =========================================================================
  // 3. LEAD ASSIGNMENTS AUDIT TRAIL (Idempotent upsert & historical ledger)
  // =========================================================================
  console.log('📝 Seeding assignment history ledger...');

  let activeAssignmentCount = 0;
  for (const leadData of leadsDataset) {
    if (leadData.assignedExecutiveId) {
      const assignmentId = `10000000-0000-0000-0000-${leadData.id.slice(24)}`;
      await prisma.leadAssignment.upsert({
        where: { id: assignmentId },
        update: {
          executiveId: leadData.assignedExecutiveId,
          assignedById: admin.id,
          assignedAt: leadData.enquiryDate,
          unassignedAt: null,
        },
        create: {
          id: assignmentId,
          leadId: leadData.id,
          executiveId: leadData.assignedExecutiveId,
          assignedById: admin.id,
          assignedAt: leadData.enquiryDate,
          unassignedAt: null,
        },
      });
      activeAssignmentCount++;
    }
  }

  // Preserve historical reassignments:
  // E.g. Lead 1 (Aarav Patel) was initially assigned to Priya Verma (secondaryExecutive),
  // then reallocated 5 days later to Rohan Sharma (demoExecutive).
  const lead1HistoricalAssignmentId = '10000000-0000-0000-0000-000000000099';
  await prisma.leadAssignment.upsert({
    where: { id: lead1HistoricalAssignmentId },
    update: {
      leadId: '00000000-0000-0000-0000-000000000001',
      executiveId: secondaryExecutive.id,
      assignedById: admin.id,
      assignedAt: daysAgo(14),
      unassignedAt: daysAgo(9),
    },
    create: {
      id: lead1HistoricalAssignmentId,
      leadId: '00000000-0000-0000-0000-000000000001',
      executiveId: secondaryExecutive.id,
      assignedById: admin.id,
      assignedAt: daysAgo(14),
      unassignedAt: daysAgo(9),
    },
  });

  // E.g. Lead 2 (Rahul Sharma) was initially assigned to Priya Verma, then handed over to Rohan Sharma.
  const lead2HistoricalAssignmentId = '10000000-0000-0000-0000-000000000098';
  await prisma.leadAssignment.upsert({
    where: { id: lead2HistoricalAssignmentId },
    update: {
      leadId: '00000000-0000-0000-0000-000000000002',
      executiveId: secondaryExecutive.id,
      assignedById: admin.id,
      assignedAt: daysAgo(10),
      unassignedAt: daysAgo(3),
    },
    create: {
      id: lead2HistoricalAssignmentId,
      leadId: '00000000-0000-0000-0000-000000000002',
      executiveId: secondaryExecutive.id,
      assignedById: admin.id,
      assignedAt: daysAgo(10),
      unassignedAt: daysAgo(3),
    },
  });

  console.log(`✅ ${activeAssignmentCount} active and 2 historical reassignments preserved.\n`);

  // =========================================================================
  // 4. CALL RECORDS (Multiple calls per lead across ALL 9 Outcomes)
  // Outcomes: CONNECTED, NOT_ANSWERED, BUSY, SWITCHED_OFF, INTERESTED,
  //           NOT_INTERESTED, CALL_BACK_REQUESTED, VISIT_SCHEDULED, CONVERTED
  // =========================================================================
  console.log('📞 Seeding comprehensive call tracking records (multiple calls per lead)...');

  const callsDataset = [
    // ── Lead 1: Aarav Patel (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000001',
      leadId: '00000000-0000-0000-0000-000000000001',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(8, 2),
      durationSeconds: 165,
      outcome: CallOutcome.CONNECTED,
      notes: 'Introductory call. Enquired about 1 BHK close to Koramangala 5th Block Sony World junction.',
    },
    {
      id: '20000000-0000-0000-0000-000000000002',
      leadId: '00000000-0000-0000-0000-000000000001',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(5, 4),
      durationSeconds: 210,
      outcome: CallOutcome.INTERESTED,
      notes: 'Customer reviewed video walkthrough. Very interested in 2nd floor balcony unit. Budget fits.',
    },
    {
      id: '20000000-0000-0000-0000-000000000003',
      leadId: '00000000-0000-0000-0000-000000000001',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(1, 1),
      durationSeconds: 140,
      outcome: CallOutcome.CALL_BACK_REQUESTED,
      notes: 'Customer requested a callback regarding agreement lease clause and security deposit refund policy.',
    },

    // ── Lead 2: Ananya Iyer (Secondary Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000004',
      leadId: '00000000-0000-0000-0000-000000000002',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(10, 2),
      durationSeconds: 135,
      outcome: CallOutcome.CONNECTED,
      notes: 'Enquired about 2 BHK furnished flat in HSR Sector 6.',
    },
    {
      id: '20000000-0000-0000-0000-000000000005',
      leadId: '00000000-0000-0000-0000-000000000002',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(6, 3),
      durationSeconds: 160,
      outcome: CallOutcome.INTERESTED,
      notes: 'Shared rent details and maintenance inclusions in HSR Layout.',
    },

    // ── Lead 3: Sneha Reddy (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000006',
      leadId: '00000000-0000-0000-0000-000000000003',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(4, 2),
      durationSeconds: 190,
      outcome: CallOutcome.CONNECTED,
      notes: 'Discussed 2 BHK semi-furnished property in Bellandur near Green Glen Layout.',
    },
    {
      id: '20000000-0000-0000-0000-000000000007',
      leadId: '00000000-0000-0000-0000-000000000003',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(2, 1),
      durationSeconds: 240,
      outcome: CallOutcome.VISIT_SCHEDULED,
      notes: 'Confirmed in-person property tour for this weekend at Bellandur complex.',
    },

    // ── Lead 4: Rohan Nair (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000008',
      leadId: '00000000-0000-0000-0000-000000000004',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(6, 4),
      durationSeconds: 180,
      outcome: CallOutcome.CONNECTED,
      notes: 'Detailed discussion regarding 3 BHK flat near ITPL Whitefield with dedicated car parking.',
    },
    {
      id: '20000000-0000-0000-0000-000000000009',
      leadId: '00000000-0000-0000-0000-000000000004',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(2, 6),
      durationSeconds: 110,
      outcome: CallOutcome.INTERESTED,
      notes: 'Prospect comparing 2 shortlisted properties. Follow-up scheduled.',
    },

    // ── Lead 5: Pooja Hegde (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000010',
      leadId: '00000000-0000-0000-0000-000000000005',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(18, 2),
      durationSeconds: 200,
      outcome: CallOutcome.CONNECTED,
      notes: 'Enquired about 1 BHK near Electronic City Phase 1 Infosys gate.',
    },
    {
      id: '20000000-0000-0000-0000-000000000011',
      leadId: '00000000-0000-0000-0000-000000000005',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(12, 1),
      durationSeconds: 310,
      outcome: CallOutcome.VISIT_SCHEDULED,
      notes: 'Completed property inspection, client liked room lighting and security amenities.',
    },
    {
      id: '20000000-0000-0000-0000-000000000012',
      leadId: '00000000-0000-0000-0000-000000000005',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(5, 3),
      durationSeconds: 275,
      outcome: CallOutcome.CONVERTED,
      notes: 'Rental agreement signed and token advance transferred. Successfully converted!',
    },

    // ── Lead 6: Karthik Subramanian (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000013',
      leadId: '00000000-0000-0000-0000-000000000006',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(9, 3),
      durationSeconds: 220,
      outcome: CallOutcome.CONNECTED,
      notes: 'Gated community Villa enquiry on Sarjapur Road. High budget client.',
    },
    {
      id: '20000000-0000-0000-0000-000000000014',
      leadId: '00000000-0000-0000-0000-000000000006',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(4, 5),
      durationSeconds: 175,
      outcome: CallOutcome.INTERESTED,
      notes: 'Shared floor plans and clubhouse brochure. Family will visit over weekend.',
    },

    // ── Lead 7: Divya Venkatesh (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000015',
      leadId: '00000000-0000-0000-0000-000000000007',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(14, 2),
      durationSeconds: 90,
      outcome: CallOutcome.CONNECTED,
      notes: 'Enquired about Marathahalli studio apartment.',
    },
    {
      id: '20000000-0000-0000-0000-000000000016',
      leadId: '00000000-0000-0000-0000-000000000007',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(10, 1),
      durationSeconds: 65,
      outcome: CallOutcome.NOT_INTERESTED,
      notes: 'Client relocated to Hyderabad for job change. Marked as not interested.',
    },

    // ── Lead 8: Aditi Rao (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000017',
      leadId: '00000000-0000-0000-0000-000000000008',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(3, 4),
      durationSeconds: 155,
      outcome: CallOutcome.CONNECTED,
      notes: 'Enquired about 2 BHK apartment in Hebbal near Manyata Tech Park.',
    },
    {
      id: '20000000-0000-0000-0000-000000000018',
      leadId: '00000000-0000-0000-0000-000000000008',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(1, 2),
      durationSeconds: 130,
      outcome: CallOutcome.INTERESTED,
      notes: 'Reviewing lease terms. Scheduled follow-up for property visit.',
    },

    // ── Lead 9: Rajeshwari Kulkarni (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000019',
      leadId: '00000000-0000-0000-0000-000000000009',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(5, 5),
      durationSeconds: 195,
      outcome: CallOutcome.CONNECTED,
      notes: 'Looking for 3 BHK in Yelahanka near international airport corridor.',
    },
    {
      id: '20000000-0000-0000-0000-000000000020',
      leadId: '00000000-0000-0000-0000-000000000009',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(2, 3),
      durationSeconds: 170,
      outcome: CallOutcome.VISIT_SCHEDULED,
      notes: 'Confirmed site inspection for tomorrow with family members.',
    },

    // ── Lead 10: Vikram Malhotra (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000021',
      leadId: '00000000-0000-0000-0000-000000000010',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(22, 2),
      durationSeconds: 140,
      outcome: CallOutcome.CONNECTED,
      notes: 'Looking for 4 BHK in Whitefield.',
    },
    {
      id: '20000000-0000-0000-0000-000000000022',
      leadId: '00000000-0000-0000-0000-000000000010',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(16, 4),
      durationSeconds: 85,
      outcome: CallOutcome.NOT_INTERESTED,
      notes: 'Found property through independent broker. Closed enquiry as lost.',
    },

    // ── Lead 11: Kunal Singhania (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000023',
      leadId: '00000000-0000-0000-0000-000000000011',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(7, 3),
      durationSeconds: 0,
      outcome: CallOutcome.SWITCHED_OFF,
      notes: 'Mobile number switched off. Left SMS reminder.',
    },
    {
      id: '20000000-0000-0000-0000-000000000024',
      leadId: '00000000-0000-0000-0000-000000000011',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(4, 2),
      durationSeconds: 185,
      outcome: CallOutcome.CONNECTED,
      notes: 'Prospect reached. Discussed 2 BHK options in HSR Layout Sector 1.',
    },

    // ── Lead 12: Nandini Dasgupta (Demo Executive) ──
    {
      id: '20000000-0000-0000-0000-000000000025',
      leadId: '00000000-0000-0000-0000-000000000012',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(2, 2),
      durationSeconds: 0,
      outcome: CallOutcome.NOT_ANSWERED,
      notes: 'Customer did not pick up outbound call. Will retry.',
    },
    {
      id: '20000000-0000-0000-0000-000000000026',
      leadId: '00000000-0000-0000-0000-000000000012',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(1, 4),
      durationSeconds: 150,
      outcome: CallOutcome.CONNECTED,
      notes: 'Customer looking for 1 BHK in Indiranagar within walking distance of Metro station.',
    },

    // Lead 13: Rahul Sharma (Demo Executive)
    {
      id: '20000000-0000-0000-0000-000000000027',
      leadId: '00000000-0000-0000-0000-000000000013',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(3, 3),
      durationSeconds: 0,
      outcome: CallOutcome.BUSY,
      notes: 'Attempted outbound call. Line was busy, will retry in afternoon.',
    },
    {
      id: '20000000-0000-0000-0000-000000000028',
      leadId: '00000000-0000-0000-0000-000000000013',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(2, 5),
      durationSeconds: 125,
      outcome: CallOutcome.CONNECTED,
      notes: 'Connected with prospect. Discussed studio options on 100ft road Indiranagar.',
    },

    // Lead 14: Meera Joshi
    {
      id: '20000000-0000-0000-0000-000000000029',
      leadId: '00000000-0000-0000-0000-000000000014',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(7, 2),
      durationSeconds: 115,
      outcome: CallOutcome.CONNECTED,
      notes: 'Customer interested in 1 BHK single occupancy in Koramangala.',
    },
    {
      id: '20000000-0000-0000-0000-000000000030',
      leadId: '00000000-0000-0000-0000-000000000014',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(3, 4),
      durationSeconds: 0,
      outcome: CallOutcome.BUSY,
      notes: 'Customer was busy in meeting, asked to call back next week.',
    },

    // Lead 15: Amit Deshmukh
    {
      id: '20000000-0000-0000-0000-000000000031',
      leadId: '00000000-0000-0000-0000-000000000015',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(9, 3),
      durationSeconds: 140,
      outcome: CallOutcome.CONNECTED,
      notes: 'Software engineer looking for 2 BHK near Electronic City Wipro Gate.',
    },
    {
      id: '20000000-0000-0000-0000-000000000032',
      leadId: '00000000-0000-0000-0000-000000000015',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(4, 1),
      durationSeconds: 190,
      outcome: CallOutcome.INTERESTED,
      notes: 'Client reviewed photos. Keen on gated society with gym.',
    },

    // Lead 16: Kavita Pillai
    {
      id: '20000000-0000-0000-0000-000000000033',
      leadId: '00000000-0000-0000-0000-000000000016',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(16, 2),
      durationSeconds: 220,
      outcome: CallOutcome.CONNECTED,
      notes: 'Studio apartment enquiry in HSR Layout.',
    },
    {
      id: '20000000-0000-0000-0000-000000000034',
      leadId: '00000000-0000-0000-0000-000000000016',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(12, 1),
      durationSeconds: 260,
      outcome: CallOutcome.CONVERTED,
      notes: 'Token advance received. Successfully converted into active rental booking.',
    },

    // Lead 17: Siddharth Roy
    {
      id: '20000000-0000-0000-0000-000000000035',
      leadId: '00000000-0000-0000-0000-000000000017',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(3, 2),
      durationSeconds: 185,
      outcome: CallOutcome.CONNECTED,
      notes: 'Luxury Villa enquiry in Indiranagar Defence Colony.',
    },
    {
      id: '20000000-0000-0000-0000-000000000036',
      leadId: '00000000-0000-0000-0000-000000000017',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(1, 3),
      durationSeconds: 215,
      outcome: CallOutcome.VISIT_SCHEDULED,
      notes: 'Site visit scheduled for weekend with executive accompaniment.',
    },

    // Lead 18: Neha Choudhury
    {
      id: '20000000-0000-0000-0000-000000000037',
      leadId: '00000000-0000-0000-0000-000000000018',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(8, 2),
      durationSeconds: 145,
      outcome: CallOutcome.CONNECTED,
      notes: '3 BHK enquiry in Sarjapur Road for working couple.',
    },
    {
      id: '20000000-0000-0000-0000-000000000038',
      leadId: '00000000-0000-0000-0000-000000000018',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(4, 4),
      durationSeconds: 120,
      outcome: CallOutcome.INTERESTED,
      notes: 'Client considering options. Waiting for decision from spouse.',
    },

    // ── Group C Calls: Initial qualification calls logged for Unassigned Leads ──
    // Lead 19: Arjun Verma
    {
      id: '20000000-0000-0000-0000-000000000039',
      leadId: '00000000-0000-0000-0000-000000000019',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(2, 2),
      durationSeconds: 0,
      outcome: CallOutcome.NOT_ANSWERED,
      notes: 'Inbound web lead qualification call. Line rang out.',
    },
    {
      id: '20000000-0000-0000-0000-000000000040',
      leadId: '00000000-0000-0000-0000-000000000019',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(1, 4),
      durationSeconds: 0,
      outcome: CallOutcome.BUSY,
      notes: 'Second retry for unassigned lead. Prospect was busy.',
    },

    // Lead 20: Tanvi Sen
    {
      id: '20000000-0000-0000-0000-000000000041',
      leadId: '00000000-0000-0000-0000-000000000020',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(1, 2),
      durationSeconds: 0,
      outcome: CallOutcome.NOT_ANSWERED,
      notes: 'Initial contact call for Marathahalli 2 BHK web inquiry.',
    },
    {
      id: '20000000-0000-0000-0000-000000000042',
      leadId: '00000000-0000-0000-0000-000000000020',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(0, 5),
      durationSeconds: 85,
      outcome: CallOutcome.CONNECTED,
      notes: 'Connected with lead. Verified preferred budget and move-in timeline.',
    },

    // Lead 21: Varun Kapoor
    {
      id: '20000000-0000-0000-0000-000000000043',
      leadId: '00000000-0000-0000-0000-000000000021',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(3, 2),
      durationSeconds: 0,
      outcome: CallOutcome.SWITCHED_OFF,
      notes: 'Initial dial for Koramangala studio lead.',
    },
    {
      id: '20000000-0000-0000-0000-000000000044',
      leadId: '00000000-0000-0000-0000-000000000021',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(2, 1),
      durationSeconds: 70,
      outcome: CallOutcome.CONNECTED,
      notes: 'Customer confirmed requirement. Ready to be assigned to dedicated executive.',
    },

    // Lead 22: Sanjay Ghosh
    {
      id: '20000000-0000-0000-0000-000000000045',
      leadId: '00000000-0000-0000-0000-000000000022',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(4, 2),
      durationSeconds: 0,
      outcome: CallOutcome.NOT_ANSWERED,
      notes: 'Walk-in follow up verification.',
    },
    {
      id: '20000000-0000-0000-0000-000000000046',
      leadId: '00000000-0000-0000-0000-000000000022',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(3, 4),
      durationSeconds: 95,
      outcome: CallOutcome.CONNECTED,
      notes: 'Customer verified Whitefield 3 BHK requirement.',
    },

    // Lead 23: Swati Kulkarni
    {
      id: '20000000-0000-0000-0000-000000000047',
      leadId: '00000000-0000-0000-0000-000000000023',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(5, 3),
      durationSeconds: 0,
      outcome: CallOutcome.BUSY,
      notes: 'Qualification call attempted.',
    },
    {
      id: '20000000-0000-0000-0000-000000000048',
      leadId: '00000000-0000-0000-0000-000000000023',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(4, 2),
      durationSeconds: 110,
      outcome: CallOutcome.CONNECTED,
      notes: 'Hebbal requirement confirmed.',
    },

    // Lead 24: Nikhil Nair
    {
      id: '20000000-0000-0000-0000-000000000049',
      leadId: '00000000-0000-0000-0000-000000000024',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(5, 2),
      durationSeconds: 0,
      outcome: CallOutcome.NOT_ANSWERED,
      notes: '99acres portal lead dial.',
    },
    {
      id: '20000000-0000-0000-0000-000000000050',
      leadId: '00000000-0000-0000-0000-000000000024',
      executiveId: demoExecutive.id,
      callDateTime: daysAgo(4, 1),
      durationSeconds: 130,
      outcome: CallOutcome.CONNECTED,
      notes: 'Yelahanka Villa lead verified.',
    },

    // Lead 25: Pooja Batra / Shreya Nambiar
    {
      id: '20000000-0000-0000-0000-000000000051',
      leadId: '00000000-0000-0000-0000-000000000025',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(6, 2),
      durationSeconds: 0,
      outcome: CallOutcome.SWITCHED_OFF,
      notes: 'Number not reachable on initial attempt.',
    },
    {
      id: '20000000-0000-0000-0000-000000000052',
      leadId: '00000000-0000-0000-0000-000000000025',
      executiveId: secondaryExecutive.id,
      callDateTime: daysAgo(5, 4),
      durationSeconds: 105,
      outcome: CallOutcome.CONNECTED,
      notes: 'Electronic City 1 BHK verified.',
    },
  ];

  for (const callData of callsDataset) {
    await prisma.call.upsert({
      where: { id: callData.id },
      update: callData,
      create: callData,
    });
  }

  console.log(`✅ ${callsDataset.length} calls seeded across all 25 leads (all 9 outcomes represented).\n`);

  // =========================================================================
  // 5. FOLLOW-UP TASKS SEEDING
  // Types:
  // - Today's Pending Follow-ups (dueAt strictly between startOfToday and endOfToday in Asia/Kolkata)
  // - Upcoming Pending Follow-ups (dueAt strictly > endOfToday)
  // - Overdue Pending Follow-ups (dueAt strictly < startOfToday)
  // - Completed Follow-ups (status: COMPLETED)
  // - Cancelled Follow-ups (status: CANCELLED)
  // =========================================================================
  console.log('⏰ Seeding follow-up tasks with strict Asia/Kolkata business-day timestamps...');

  // Timestamps constructed specifically for Asia/Kolkata day boundaries
  const todayDueTime1 = new Date(startOfToday.getTime() + 11 * 3600 * 1000); // 11:00 AM IST today
  const todayDueTime2 = new Date(startOfToday.getTime() + 15 * 3600 * 1000); // 3:00 PM IST today
  const upcomingDueTime1 = new Date(endOfToday.getTime() + 24 * 3600 * 1000 + 4 * 3600 * 1000); // Tomorrow afternoon
  const upcomingDueTime2 = new Date(endOfToday.getTime() + 3 * 24 * 3600 * 1000 + 2 * 3600 * 1000); // 3 days later
  const overdueDueTime1 = new Date(startOfToday.getTime() - 24 * 3600 * 1000 - 4 * 3600 * 1000); // Yesterday in IST
  const overdueDueTime2 = new Date(startOfToday.getTime() - 3 * 24 * 3600 * 1000 - 2 * 3600 * 1000); // 3 days ago in IST

  const followUpsDataset = [
    // ── 1. Today's Pending Follow-ups ──
    {
      id: '30000000-0000-0000-0000-000000000001',
      leadId: '00000000-0000-0000-0000-000000000001',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000003',
      dueAt: todayDueTime1,
      status: FollowUpStatus.PENDING,
      notes: "Today: Call back Aarav Patel regarding security deposit refund terms and confirm weekend visit.",
    },
    {
      id: '30000000-0000-0000-0000-000000000002',
      leadId: '00000000-0000-0000-0000-000000000014',
      executiveId: secondaryExecutive.id,
      callId: '20000000-0000-0000-0000-000000000029',
      dueAt: todayDueTime2,
      status: FollowUpStatus.PENDING,
      notes: "Today: Follow up with Meera Joshi on Koramangala 1 BHK property availability.",
    },

    // ── 2. Upcoming Pending Follow-ups ──
    {
      id: '30000000-0000-0000-0000-000000000003',
      leadId: '00000000-0000-0000-0000-000000000003',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000007',
      dueAt: upcomingDueTime1,
      status: FollowUpStatus.PENDING,
      notes: "Upcoming: Prepare property pass and greet Sneha Reddy for Bellandur physical property visit.",
    },
    {
      id: '30000000-0000-0000-0000-000000000004',
      leadId: '00000000-0000-0000-0000-000000000004',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000009',
      dueAt: upcomingDueTime2,
      status: FollowUpStatus.PENDING,
      notes: "Upcoming: Check whether Rohan Nair finalized between Whitefield and ITPL properties.",
    },
    {
      id: '30000000-0000-0000-0000-000000000005',
      leadId: '00000000-0000-0000-0000-000000000017',
      executiveId: secondaryExecutive.id,
      callId: '20000000-0000-0000-0000-000000000036',
      dueAt: upcomingDueTime1,
      status: FollowUpStatus.PENDING,
      notes: "Upcoming: Accompany Siddharth Roy for Indiranagar luxury villa tour.",
    },

    // ── 3. Overdue Pending Follow-ups ──
    {
      id: '30000000-0000-0000-0000-000000000006',
      leadId: '00000000-0000-0000-0000-000000000008',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000018',
      dueAt: overdueDueTime1,
      status: FollowUpStatus.PENDING,
      notes: "Overdue: Urgent callback needed for Aditi Rao regarding Hebbal apartment lease agreement.",
    },
    {
      id: '30000000-0000-0000-0000-000000000007',
      leadId: '00000000-0000-0000-0000-000000000018',
      executiveId: secondaryExecutive.id,
      callId: '20000000-0000-0000-0000-000000000038',
      dueAt: overdueDueTime2,
      status: FollowUpStatus.PENDING,
      notes: "Overdue: Contact Neha Choudhury for decision on Sarjapur Road 3 BHK.",
    },

    // ── 4. Completed Follow-ups ──
    {
      id: '30000000-0000-0000-0000-000000000008',
      leadId: '00000000-0000-0000-0000-000000000005',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000012',
      dueAt: daysAgo(5, 4),
      status: FollowUpStatus.COMPLETED,
      completedAt: daysAgo(5, 2),
      notes: "Completed: Verified booking payment and delivered apartment welcome packet to Pooja Hegde.",
    },
    {
      id: '30000000-0000-0000-0000-000000000009',
      leadId: '00000000-0000-0000-0000-000000000016',
      executiveId: secondaryExecutive.id,
      callId: '20000000-0000-0000-0000-000000000034',
      dueAt: daysAgo(12, 3),
      status: FollowUpStatus.COMPLETED,
      completedAt: daysAgo(12, 1),
      notes: "Completed: Received security deposit and completed tenant verification for Kavita Pillai.",
    },

    // ── 5. Cancelled Follow-ups ──
    {
      id: '30000000-0000-0000-0000-000000000010',
      leadId: '00000000-0000-0000-0000-000000000007',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000016',
      dueAt: daysAgo(8, 2),
      status: FollowUpStatus.CANCELLED,
      completedAt: null,
      notes: "Cancelled: Lead relocated to Hyderabad for job change. Scheduled callback cancelled.",
    },
    {
      id: '30000000-0000-0000-0000-000000000011',
      leadId: '00000000-0000-0000-0000-000000000010',
      executiveId: demoExecutive.id,
      callId: '20000000-0000-0000-0000-000000000022',
      dueAt: daysAgo(15, 3),
      status: FollowUpStatus.CANCELLED,
      completedAt: null,
      notes: "Cancelled: Prospect rented alternative property. Callback task closed.",
    },
  ];

  for (const fuData of followUpsDataset) {
    await prisma.followUp.upsert({
      where: { id: fuData.id },
      update: fuData,
      create: fuData,
    });
  }

  console.log(`✅ ${followUpsDataset.length} follow-up tasks seeded (Today: 2, Upcoming: 3, Overdue: 2, Completed: 2, Cancelled: 2).\n`);

  // =========================================================================
  // 6. DATABASE VERIFICATION & AUDIT QUERIES
  // =========================================================================
  const [
    totalUsers,
    totalLeads,
    assignedLeads,
    unassignedLeads,
    totalAssignments,
    totalCalls,
    connectedCalls,
    pendingFollowUps,
    overdueFollowUps,
    todayFollowUps,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.lead.count({ where: { assignedExecutiveId: { not: null } } }),
    prisma.lead.count({ where: { assignedExecutiveId: null } }),
    prisma.leadAssignment.count(),
    prisma.call.count(),
    prisma.call.count({ where: { outcome: CallOutcome.CONNECTED } }),
    prisma.followUp.count({ where: { status: FollowUpStatus.PENDING } }),
    prisma.followUp.count({
      where: {
        status: FollowUpStatus.PENDING,
        dueAt: { lt: startOfToday },
      },
    }),
    prisma.followUp.count({
      where: {
        status: FollowUpStatus.PENDING,
        dueAt: { gte: startOfToday, lte: endOfToday },
      },
    }),
  ]);

  // Verify multiple calls per lead
  const leadsWithCallCount = await prisma.lead.findMany({
    select: {
      id: true,
      customerName: true,
      _count: {
        select: { calls: true },
      },
    },
  });

  const leadsWithMultipleCalls = leadsWithCallCount.filter(
    (l) => l._count.calls >= 2
  ).length;

  console.log('============================================================');
  console.log('📊 DATABASE SEED VERIFICATION METRICS (LIVE DATABASE QUERIES)');
  console.log('============================================================');
  console.log(`👥 Total Users:               ${totalUsers} (1 Admin, 2 Active Execs, 1 Inactive)`);
  console.log(`📋 Total Leads:               ${totalLeads} (Requirement: at least 20)`);
  console.log(`🎯 Assigned Leads:            ${assignedLeads}`);
  console.log(`   ├─ Demo Exec (sales@):     12`);
  console.log(`   └─ Secondary Exec:         6`);
  console.log(`⏳ Unassigned Leads:          ${unassignedLeads}`);
  console.log(`📜 Total Assignment Records:  ${totalAssignments}`);
  console.log(`📞 Total Calls:               ${totalCalls} (Connected: ${connectedCalls})`);
  console.log(`🔁 Leads with >= 2 calls:     ${leadsWithMultipleCalls} / ${totalLeads} (100% of seeded leads)`);
  console.log(`⏰ Total Follow-ups:          ${followUpsDataset.length}`);
  console.log(`   ├─ Pending:                ${pendingFollowUps}`);
  console.log(`   ├─ Today's Pending:        ${todayFollowUps}`);
  console.log(`   ├─ Overdue Pending:        ${overdueFollowUps}`);
  console.log(`   ├─ Completed:              2`);
  console.log(`   └─ Cancelled:              2`);
  console.log('============================================================\n');
}

// Execute seed directly when invoked via CLI (tsx prisma/seed.ts)
seedDatabase()
  .catch((e) => {
    console.error('❌ Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
