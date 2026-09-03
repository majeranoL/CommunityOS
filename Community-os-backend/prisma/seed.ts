import {
  PrismaClient,
  CommunityStatus,
  AccountStatus,
  UserStatus,
  HouseholdStatus,
  FacilityStatus,
  FacilityType,
  Gender,
  CivilStatus,
  ResidentStatus,
  VisitorStatus,
  VehicleType,
  VehicleStatus,
  StickerStatus,
  StaffRole,
  StaffStatus,
  PetSpecies,
  PetStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  AnnouncementStatus,
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  ReservationStatus,
  AssessmentStatus,
  PaymentStatus,
  PaymentMethod,
  FinanceCategory,
  ExpenseCategory,
  ChargeRecurrence,
  LateFeeType,
  BillingPeriodStatus,
  UtilityType,
  UtilityRateMode,
  DocumentCategory,
  DocumentStatus,
  EventStatus,
  BillingCycle,
  SubscriptionStatus,
  InvoiceStatus,
  PollStatus,
  FeatureType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdir, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { MEMBER_PERMISSIONS, permissions } from './permissions';

const prisma = new PrismaClient();

const DUES_AMOUNT = 1200;

function date(iso: string): Date {
  return new Date(`${iso}T16:00:00.000Z`);
}

function hoursAfter(iso: string, hours: number): Date {
  return new Date(date(iso).getTime() + hours * 60 * 60 * 1000);
}

async function main() {
  // =====================================================
  // CLEAN DATABASE (FK-safe order, children first)
  // =====================================================

  await prisma.otpVerification.deleteMany();
  await prisma.platformSetting.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.featureAuditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.eventAttendee.deleteMany();
  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.vehicleSticker.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.pet.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.utilityReading.deleteMany();
  await prisma.utilityConfig.deleteMany();
  await prisma.utilityExpense.deleteMany();
  await prisma.paymentAllocation.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.billingPeriod.deleteMany();
  await prisma.chargeType.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.document.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.billingExemption.deleteMany();
  await prisma.household.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.communityFeature.deleteMany();
  await prisma.feature.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.community.deleteMany();

  console.log('✅ Database cleared');

  // =====================================================
  // COMMUNITY
  // =====================================================

  const community = await prisma.community.create({
    data: {
      code: 'COMMUNITY001',
      slug: 'community-os-demo',
      displayName: 'CommunityOS Demo HOA',
      email: 'hoa@communityosdemo.com',
      contactNumber: '09123456789',
      address: '123 Sampaguita Street, Barangay San Isidro, Antipolo City, Rizal',
      status: CommunityStatus.ACTIVE,
    },
  });

  console.log('✅ Community created');

  // =====================================================
  // CHARGE TYPES
  // =====================================================

  const monthlyDuesChargeType = await prisma.chargeType.create({
    data: {
      communityId: community.id,
      code: 'monthly-dues',
      name: 'Monthly Association Dues',
      category: FinanceCategory.DUES,
      recurrence: ChargeRecurrence.RECURRING,
      amount: DUES_AMOUNT,
      dueDay: 28,
      gracePeriodDays: 5,
      lateFeeType: LateFeeType.PERCENT,
      lateFeeValue: 2,
      autoGenerate: true,
      description: 'Monthly homeowners association dues.',
      allowAdvancePayment: true,
      isActive: true,
      sortOrder: 1,
    },
  });

  const utilityChargeType = await prisma.chargeType.create({
    data: {
      communityId: community.id,
      code: 'utility-charge',
      name: 'Utility Charge',
      category: FinanceCategory.UTILITY,
      recurrence: ChargeRecurrence.RECURRING,
      description: 'Recoverable utility charges (water, electricity, etc.).',
      allowAdvancePayment: true,
      isActive: true,
      sortOrder: 2,
    },
  });

  const specialChargeType = await prisma.chargeType.create({
    data: {
      communityId: community.id,
      code: 'special-assessment',
      name: 'Special Assessment',
      category: FinanceCategory.SPECIAL_ASSESSMENT,
      recurrence: ChargeRecurrence.ONE_TIME,
      description: 'One-time assessment for community projects.',
      isActive: true,
      sortOrder: 3,
    },
  });

  const otherChargeTypesData = [
    {
      code: 'construction-bond',
      name: 'Construction / Renovation Bond',
      category: FinanceCategory.BOND,
      description: 'Refundable bond for construction or renovation work.',
    },
    {
      code: 'facility-fee',
      name: 'Facility Usage Fee',
      category: FinanceCategory.FACILITY_FEE,
      description: 'Fee for booking or using community facilities.',
    },
    {
      code: 'vehicle-sticker',
      name: 'Vehicle Sticker / Gate Pass Fee',
      category: FinanceCategory.VEHICLE_STICKER,
      description: 'Fee for vehicle stickers or gate passes.',
    },
    {
      code: 'parking-fee',
      name: 'Parking Fee',
      category: FinanceCategory.PARKING_FEE,
      description: 'Monthly parking slot fee.',
    },
    {
      code: 'membership-fee',
      name: 'Membership / Registration Fee',
      category: FinanceCategory.MEMBERSHIP_FEE,
      description: 'One-time membership or registration fee.',
    },
    {
      code: 'late-penalty',
      name: 'Late Payment Penalty',
      category: FinanceCategory.LATE_PENALTY,
      description: 'Penalty for late payment of dues.',
    },
    {
      code: 'violation-fine',
      name: 'Violation Fine',
      category: FinanceCategory.VIOLATION_FINE,
      description: 'Fine imposed for HOA rule violations.',
    },
    {
      code: 'other',
      name: 'Other Charge',
      category: FinanceCategory.OTHER,
      description: 'Custom HOA-defined charge.',
    },
  ];

  for (const [index, item] of otherChargeTypesData.entries()) {
    await prisma.chargeType.create({
      data: {
        communityId: community.id,
        ...item,
        recurrence: ChargeRecurrence.ONE_TIME,
        isActive: true,
        sortOrder: index + 4,
      },
    });
  }

  console.log('✅ Charge types created');

  // =====================================================
  // UTILITY CONFIGS (water metered + garbage flat)
  // =====================================================

  const waterConfig = await prisma.utilityConfig.create({
    data: {
      communityId: community.id,
      utilityType: UtilityType.WATER,
      name: 'Water',
      rateMode: UtilityRateMode.METERED,
      unitRate: 35,
      chargeTypeId: utilityChargeType.id,
      isActive: true,
    },
  });

  await prisma.utilityConfig.create({
    data: {
      communityId: community.id,
      utilityType: UtilityType.GARBAGE,
      name: 'Garbage',
      rateMode: UtilityRateMode.FIXED,
      fixedRate: 100,
      chargeTypeId: utilityChargeType.id,
      isActive: true,
    },
  });

  console.log('✅ Utility configs created');

  // =====================================================
  // SUBSCRIPTION PLANS
  // =====================================================

  const plans = await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        code: 'community-basic',
        name: 'Community Basic',
        description: 'Essential features for small communities',
        price: 500,
        billingCycle: BillingCycle.MONTHLY,
        features: [
          'Up to 20 households',
          'Complaint management',
          'Event calendar',
          'Community directory',
        ],
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        code: 'community-standard',
        name: 'Community Standard',
        description: 'Popular plan for growing communities',
        price: 1000,
        billingCycle: BillingCycle.MONTHLY,
        features: [
          'Up to 100 households',
          'Facility & amenity booking',
          'Vehicle management',
          'Analytics dashboard',
          'Email notifications',
        ],
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        code: 'community-premium',
        name: 'Community Premium',
        description: 'Advanced plan with full feature set',
        price: 1500,
        billingCycle: BillingCycle.MONTHLY,
        includesAllFeatures: true,
        features: [
          'Unlimited households',
          'Maintenance & staff module',
          'Reports & exports',
          'Priority support',
          'Custom branding',
        ],
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ ${plans.length} subscription plans created`);

  // =====================================================
  // PLAN FEATURES
  // =====================================================

  const basicPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'community-basic' },
  });
  const standardPlanRef = await prisma.subscriptionPlan.findUnique({
    where: { code: 'community-standard' },
  });
  const premiumPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'community-premium' },
  });

  // Map plan codes to plan IDs for later feature linking
  const planIds = {
    basic: basicPlan?.id,
    standard: standardPlanRef?.id,
    premium: premiumPlan?.id,
  };

  // =====================================================
  // ROLES & PERMISSIONS
  // =====================================================

  const presidentRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'President',
      description: 'Community President',
      isSystem: true,
    },
  });

  const vicePresidentRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'Vice President',
      description: 'Acts on behalf of the President',
      isSystem: true,
    },
  });

  const treasurerRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'Treasurer',
      description: 'Handles dues, payments, expenses, and financial reports',
      isSystem: true,
    },
  });

  const secretaryRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'Secretary',
      description: 'Handles records, announcements, events, and correspondence',
      isSystem: true,
    },
  });

  const memberRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'Member',
      description: 'Community Member',
      isSystem: true,
    },
  });

  const renterRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'Renter',
      description: 'Renter (tenant) - limited account for a rented unit',
      isSystem: true,
    },
  });

  console.log('✅ Roles created');

  // =====================================================
  // PERMISSIONS & ROLE ASSIGNMENTS
  // =====================================================

  const allPermissionCodes = permissions.map((item) => item.code);

  const rolePermissionSets: { roleId: string; codes: string[] }[] = [
    { roleId: presidentRole.id, codes: allPermissionCodes },
    {
      roleId: vicePresidentRole.id,
      codes: allPermissionCodes.filter(
        (code) => !['community.delete', 'user.delete', 'audit.manage'].includes(code),
      ),
    },
    {
      roleId: treasurerRole.id,
      codes: [
        'dashboard.view',
        'household.view',
        'resident.view',
        'assessment.create',
        'assessment.update',
        'assessment.delete',
        'assessment.view',
        'assessment.issue',
        'assessment.cancel',
        'payment.create',
        'payment.update',
        'payment.delete',
        'payment.view',
        'payment.cancel',
        'billing.create',
        'billing.update',
        'billing.approve',
        'billing.view',
        'billing.manage',
        'finance.view_own',
        'finance.view_all',
        'finance.verify',
        'finance.reject',
        'finance.refund',
        'finance.cancel',
        'finance.import',
        'finance.export',
        'finance.manage',
        'finance.waive',
        'finance.expense_view',
        'finance.expense_create',
        'finance.expense_update',
        'finance.expense_delete',
        'finance.expense_import',
        'finance.expense_export',
        'finance.income_statement_view',
        'reports.export',
        'analytics.view',
        'notification.view',
        'notification.update',
        'settings.view',
      ],
    },
    {
      roleId: secretaryRole.id,
      codes: [
        'dashboard.view',
        'announcement.create',
        'announcement.update',
        'announcement.delete',
        'announcement.view',
        'announcement.publish',
        'event.create',
        'event.update',
        'event.delete',
        'event.view',
        'event.publish',
        'event.cancel',
        'event.complete',
        'poll.create',
        'poll.update',
        'poll.delete',
        'poll.view',
        'poll.publish',
        'poll.close',
        'document.create',
        'document.update',
        'document.delete',
        'document.view',
        'document.publish',
        'document.archive',
        'complaint.view',
        'complaint.update',
        'complaint.assign',
        'complaint.resolve',
        'complaint.close',
        'complaint.review',
        'resident.view',
        'resident.create',
        'resident.update',
        'household.view',
        'household.create',
        'household.update',
        'visitor.view',
        'visitor.create',
        'visitor.update',
        'visitor.check-in',
        'visitor.check-out',
        'facility.view',
        'reservation.view',
        'reservation.update',
        'reservation.approve',
        'reservation.reject',
        'reservation.cancel',
        'reservation.complete',
        'upload.file',
        'notification.view',
        'notification.update',
        'settings.view',
      ],
    },
  ];

  const permissionIdByCode = new Map<string, string>();

  for (const item of permissions) {
    const permission = await prisma.permission.create({
      data: {
        communityId: community.id,
        code: item.code,
        module: item.module,
        description: item.description,
      },
    });

    permissionIdByCode.set(item.code, permission.id);
  }

  for (const { roleId, codes } of rolePermissionSets) {
    await prisma.rolePermission.createMany({
      data: codes
        .filter((code) => permissionIdByCode.has(code))
        .map((code) => ({ roleId, permissionId: permissionIdByCode.get(code)! })),
    });
  }

  for (const roleId of [memberRole.id, renterRole.id]) {
    for (const code of MEMBER_PERMISSIONS) {
      const permissionId = permissionIdByCode.get(code);

      if (permissionId) {
        await prisma.rolePermission.create({
          data: { roleId, permissionId },
        });
      }
    }
  }

  console.log('✅ Permissions created');

  // =====================================================
  // ADMIN ACCOUNT & USER
  // =====================================================

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const adminAccount = await prisma.account.create({
    data: {
      email: 'admin@communityos.com',
      passwordHash,
      status: AccountStatus.ACTIVE,
    },
  });

  const admin = await prisma.user.create({
    data: {
      accountId: adminAccount.id,
      communityId: community.id,
      referenceNumber: 'USR-000001',
      firstName: 'System',
      lastName: 'Administrator',
      status: UserStatus.ACTIVE,
      isPlatformAdmin: true,
    },
  });

  await prisma.userRole.create({
    data: { userId: admin.id, roleId: presidentRole.id },
  });

  console.log('✅ Admin user created');

  // =====================================================
  // HOUSEHOLDS
  // =====================================================

  const householdData = [
    { block: 'A', lot: '1', address: 'Block A, Lot 1 - 12 Sampaguita St.' },
    { block: 'A', lot: '2', address: 'Block A, Lot 2 - 14 Sampaguita St.' },
    { block: 'A', lot: '3', address: 'Block A, Lot 3 - 16 Sampaguita St.' },
    { block: 'B', lot: '1', address: 'Block B, Lot 1 - 5 Ilang-Ilang St.' },
    { block: 'B', lot: '2', address: 'Block B, Lot 2 - 7 Ilang-Ilang St.' },
    { block: 'B', lot: '3', address: 'Block B, Lot 3 - 9 Ilang-Ilang St.' },
    { block: 'C', lot: '1', address: 'Block C, Lot 1 - 3 Gumamela St.' },
    { block: 'C', lot: '2', address: 'Block C, Lot 2 - 5 Gumamela St.' },
    { block: 'D', lot: '1', address: 'Block D, Lot 1 - 8 Molave St.' },
    { block: 'D', lot: '2', address: 'Block D, Lot 2 - 10 Molave St.' },
  ];

  const households: { id: string }[] = [];

  for (const item of householdData) {
    const household = await prisma.household.create({
      data: {
        communityId: community.id,
        ...item,
        status: HouseholdStatus.ACTIVE,
      },
    });
    households.push(household);
  }

  console.log('✅ 10 households created');

  // =====================================================
  // RESIDENTS
  // =====================================================

  type ResidentSeed = {
    firstName: string;
    middleName?: string;
    lastName: string;
    gender: Gender;
    civilStatus: CivilStatus;
    phoneNumber: string;
    email?: string;
    householdIndex: number;
  };

  const residentData: ResidentSeed[] = [
    { firstName: 'Juan', middleName: 'Santos', lastName: 'Dela Cruz', gender: Gender.MALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234567', email: 'juan.delacruz@example.com', householdIndex: 0 },
    { firstName: 'Maria', middleName: 'Lopez', lastName: 'Dela Cruz', gender: Gender.FEMALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234568', email: 'maria.delacruz@example.com', householdIndex: 0 },
    { firstName: 'Pedro', lastName: 'Reyes', gender: Gender.MALE, civilStatus: CivilStatus.SINGLE, phoneNumber: '09171234569', email: 'pedro.reyes@example.com', householdIndex: 1 },
    { firstName: 'Ana', lastName: 'Garcia', gender: Gender.FEMALE, civilStatus: CivilStatus.SINGLE, phoneNumber: '09171234570', email: 'ana.garcia@example.com', householdIndex: 2 },
    { firstName: 'Carlo', lastName: 'Mendoza', gender: Gender.MALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234571', email: 'carlo.mendoza@example.com', householdIndex: 3 },
    { firstName: 'Liwayway', lastName: 'Mendoza', gender: Gender.FEMALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234572', email: 'liwayway.mendoza@example.com', householdIndex: 3 },
    { firstName: 'Rosa', lastName: 'Villanueva', gender: Gender.FEMALE, civilStatus: CivilStatus.WIDOWED, phoneNumber: '09171234573', email: 'rosa.villanueva@example.com', householdIndex: 4 },
    { firstName: 'Miguel', lastName: 'Torres', gender: Gender.MALE, civilStatus: CivilStatus.SINGLE, phoneNumber: '09171234574', email: 'miguel.torres@example.com', householdIndex: 5 },
    { firstName: 'Lorna', lastName: 'Bautista', gender: Gender.FEMALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234575', email: 'lorna.bautista@example.com', householdIndex: 6 },
    { firstName: 'Efren', lastName: 'Ramos', gender: Gender.MALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234576', email: 'efren.ramos@example.com', householdIndex: 7 },
    { firstName: 'Judith', lastName: 'Ramos', gender: Gender.FEMALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234577', email: 'judith.ramos@example.com', householdIndex: 7 },
    { firstName: 'Grace', lastName: 'Lim', gender: Gender.FEMALE, civilStatus: CivilStatus.SINGLE, phoneNumber: '09171234578', email: 'grace.lim@example.com', householdIndex: 8 },
    { firstName: 'Danilo', lastName: 'Aquino', gender: Gender.MALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234579', email: 'danilo.aquino@example.com', householdIndex: 9 },
    { firstName: 'Susan', lastName: 'Aquino', gender: Gender.FEMALE, civilStatus: CivilStatus.MARRIED, phoneNumber: '09171234580', email: 'susan.aquino@example.com', householdIndex: 9 },
  ];

  const residents: { id: string }[] = [];
  let residentCounter = 1;

  for (const item of residentData) {
    const { householdIndex, ...data } = item;
    const resident = await prisma.resident.create({
      data: {
        communityId: community.id,
        householdId: households[householdIndex].id,
        residentNumber: `RES-${String(residentCounter++).padStart(6, '0')}`,
        status: ResidentStatus.ACTIVE,
        ...data,
      },
    });
    residents.push(resident);
  }

  console.log('✅ Residents created');

  // =====================================================
  // DEMO MEMBER USERS
  // =====================================================

  // Note: Ana (H2), Rosa (H4), and Danilo (H9) live in households in BAD
  // standing, so they can demo the "bad standing" QR rejection.
  const demoUserData = [
    { referenceNumber: 'USR-000002', email: 'juan.delacruz@example.com', firstName: 'Juan', lastName: 'Dela Cruz', residentIndex: 0, roleId: memberRole.id },
    { referenceNumber: 'USR-000003', email: 'pedro.reyes@example.com', firstName: 'Pedro', lastName: 'Reyes', residentIndex: 2, roleId: memberRole.id },
    { referenceNumber: 'USR-000004', email: 'maria.delacruz@example.com', firstName: 'Maria', lastName: 'Dela Cruz', residentIndex: 1, roleId: treasurerRole.id },
    { referenceNumber: 'USR-000005', email: 'carlo.mendoza@example.com', firstName: 'Carlo', lastName: 'Mendoza', residentIndex: 4, roleId: secretaryRole.id },
    { referenceNumber: 'USR-000006', email: 'lorna.bautista@example.com', firstName: 'Lorna', lastName: 'Bautista', residentIndex: 8, roleId: vicePresidentRole.id },
    { referenceNumber: 'USR-000007', email: 'ana.garcia@example.com', firstName: 'Ana', lastName: 'Garcia', residentIndex: 3, roleId: memberRole.id },
    { referenceNumber: 'USR-000008', email: 'rosa.villanueva@example.com', firstName: 'Rosa', lastName: 'Villanueva', residentIndex: 6, roleId: memberRole.id },
    { referenceNumber: 'USR-000009', email: 'danilo.aquino@example.com', firstName: 'Danilo', lastName: 'Aquino', residentIndex: 12, roleId: memberRole.id },
  ];

  const demoUsers: { id: string }[] = [];

  for (const item of demoUserData) {
    const account = await prisma.account.create({
      data: {
        email: item.email,
        passwordHash,
        status: AccountStatus.ACTIVE,
      },
    });

    const user = await prisma.user.create({
      data: {
        accountId: account.id,
        communityId: community.id,
        referenceNumber: item.referenceNumber,
        firstName: item.firstName,
        lastName: item.lastName,
        residentId: residents[item.residentIndex].id,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.userRole.create({
      data: { userId: user.id, roleId: item.roleId },
    });

    demoUsers.push(user);
  }

  console.log('✅ Demo users created');

  // =====================================================
  // BILLING PERIODS & MONTHLY DUES (Apr–Aug 2026)
  //
  // Standing rule: a household is BAD when it has >= 3
  // distinct unpaid months (delinquencyThresholdMonths, see
  // communityFeature config below). Households with all five
  // months (or a large chunk) unpaid are flagged BAD so the
  // gate + good-standing demo has real bad-standing data:
  //   householdIndex 2 (Ana)      -> BAD (5 unpaid months)
  //   householdIndex 4 (Rosa)     -> BAD (5 unpaid months)
  //   householdIndex 9 (Danilo)   -> BAD (5 unpaid months)
  //   everyone else               -> GOOD / current
  // =====================================================

  type DuesOutcome =
    | 'PAID'
    | 'PARTIAL'
    | 'PENDING_PAYMENT'
    | 'OVERDUE'
    | 'WAIVED'
    | 'ISSUED';

  const monthPlans: {
    key: string;
    label: string;
    outcomes: DuesOutcome[];
  }[] = [
    {
      key: '2026-04',
      label: 'April 2026',
      outcomes: ['PAID', 'PAID', 'OVERDUE', 'PAID', 'OVERDUE', 'PAID', 'PAID', 'PAID', 'PAID', 'OVERDUE'],
    },
    {
      key: '2026-05',
      label: 'May 2026',
      outcomes: ['PAID', 'PAID', 'OVERDUE', 'PAID', 'OVERDUE', 'PAID', 'PAID', 'PAID', 'PAID', 'OVERDUE'],
    },
    {
      key: '2026-06',
      label: 'June 2026',
      outcomes: ['PAID', 'PAID', 'PARTIAL', 'PAID', 'OVERDUE', 'PAID', 'PARTIAL', 'PAID', 'PAID', 'OVERDUE'],
    },
    {
      key: '2026-07',
      label: 'July 2026',
      outcomes: ['PAID', 'PAID', 'PARTIAL', 'PAID', 'OVERDUE', 'PAID', 'WAIVED', 'PAID', 'PAID', 'OVERDUE'],
    },
    {
      key: '2026-08',
      label: 'August 2026',
      outcomes: ['PAID', 'ISSUED', 'ISSUED', 'PENDING_PAYMENT', 'ISSUED', 'PARTIAL', 'ISSUED', 'PAID', 'ISSUED', 'ISSUED'],
    },
  ];

  const methods = [PaymentMethod.CASH, PaymentMethod.GCASH, PaymentMethod.BANK_TRANSFER, PaymentMethod.CHEQUE];

  let assessmentCounter = 1;
  let paymentCounter = 1;

  for (const plan of monthPlans) {
    const billingPeriod = await prisma.billingPeriod.create({
      data: {
        communityId: community.id,
        chargeTypeId: monthlyDuesChargeType.id,
        label: `Monthly Dues - ${plan.label}`,
        periodKey: plan.key,
        startDate: date(`${plan.key}-01`),
        endDate: date(`${plan.key}-28`),
        dueDate: date(`${plan.key}-28`),
        amount: DUES_AMOUNT,
        status: BillingPeriodStatus.OPEN,
      },
    });

    for (const [householdIndex, outcome] of plan.outcomes.entries()) {
      const statusByOutcome: Record<DuesOutcome, AssessmentStatus> = {
        PAID: AssessmentStatus.PAID,
        PARTIAL: AssessmentStatus.PARTIALLY_PAID,
        PENDING_PAYMENT: AssessmentStatus.ISSUED,
        OVERDUE: AssessmentStatus.OVERDUE,
        WAIVED: AssessmentStatus.WAIVED,
        ISSUED: AssessmentStatus.ISSUED,
      };

      const paidAmount =
        outcome === 'PAID'
          ? DUES_AMOUNT
          : outcome === 'PARTIAL'
            ? householdIndex === 5
              ? 400
              : 600
            : 0;

      const assessment = await prisma.assessment.create({
        data: {
          communityId: community.id,
          householdId: households[householdIndex].id,
          chargeTypeId: monthlyDuesChargeType.id,
          billingPeriodId: billingPeriod.id,
          assessmentNumber: `ASS-${String(assessmentCounter++).padStart(6, '0')}`,
          title: `Monthly Association Dues - ${plan.label}`,
          description: `Monthly association dues for ${plan.label}.`,
          amount: DUES_AMOUNT,
          dueDate: date(`${plan.key}-28`),
          period: plan.key,
          paidAmount,
          remarks:
            outcome === 'WAIVED'
              ? 'Board-approved waiver (hardship).'
              : undefined,
          status: statusByOutcome[outcome],
        },
      });

      if (outcome === 'PAID' || outcome === 'PARTIAL' || outcome === 'PENDING_PAYMENT') {
        const day = String(Math.min(4 + householdIndex * 2, 27)).padStart(2, '0');
        const residentIndex = householdIndex < residentData.length ? householdIndex : 0;

        const payment = await prisma.payment.create({
          data: {
            communityId: community.id,
            assessmentId: assessment.id,
            residentId: residents[residentIndex].id,
            paymentNumber: `PAY-${String(paymentCounter++).padStart(6, '0')}`,
            amount: outcome === 'PARTIAL' ? paidAmount : DUES_AMOUNT,
            paymentDate: date(`${plan.key}-${day}`),
            method: outcome === 'PENDING_PAYMENT' ? PaymentMethod.GCASH : methods[(householdIndex + monthPlans.indexOf(plan)) % methods.length],
            referenceNumber:
              outcome === 'PENDING_PAYMENT'
                ? 'GC-991827'
                : outcome === 'PARTIAL'
                  ? `PT-${plan.key.replace('-', '')}${householdIndex}`
                  : undefined,
            status:
              outcome === 'PENDING_PAYMENT'
                ? PaymentStatus.PENDING_VERIFICATION
                : PaymentStatus.VERIFIED,
          },
        });

        if (payment.status === PaymentStatus.VERIFIED) {
          await prisma.paymentAllocation.create({
            data: {
              communityId: community.id,
              paymentId: payment.id,
              assessmentId: assessment.id,
              allocatedAmount: payment.amount,
            },
          });
        }
      }
    }
  }

  console.log('✅ Monthly dues assessments & payments created');

  // =====================================================
  // SPECIAL ASSESSMENT (paid)
  // =====================================================

  const specialAssessment = await prisma.assessment.create({
    data: {
      communityId: community.id,
      householdId: households[0].id,
      chargeTypeId: specialChargeType.id,
      assessmentNumber: `ASS-${String(assessmentCounter++).padStart(6, '0')}`,
      title: 'Special Assessment - Gate Repairs',
      description: 'One-time assessment for main gate repairs.',
      amount: 2500,
      dueDate: date('2026-09-15'),
      period: '2026-08',
      paidAmount: 2500,
      status: AssessmentStatus.PAID,
    },
  });

  const specialPayment = await prisma.payment.create({
    data: {
      communityId: community.id,
      assessmentId: specialAssessment.id,
      residentId: residents[0].id,
      paymentNumber: `PAY-${String(paymentCounter++).padStart(6, '0')}`,
      amount: 2500,
      paymentDate: date('2026-08-18'),
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'BT-220191',
      status: PaymentStatus.VERIFIED,
    },
  });

  await prisma.paymentAllocation.create({
    data: {
      communityId: community.id,
      paymentId: specialPayment.id,
      assessmentId: specialAssessment.id,
      allocatedAmount: 2500,
    },
  });

  console.log('✅ Special assessment created');

  // =====================================================
  // EXPENSES & UTILITY BILLS
  // =====================================================

  const expenseData = [
    { title: 'Security guard services', category: ExpenseCategory.SALARIES, amount: 5000, expenseDate: date('2026-06-30'), method: PaymentMethod.CASH, payee: 'Ramon Aquino' },
    { title: 'Security guard services', category: ExpenseCategory.SALARIES, amount: 5000, expenseDate: date('2026-07-31'), method: PaymentMethod.CASH, payee: 'Ramon Aquino' },
    { title: 'Pool pump repair', category: ExpenseCategory.MAINTENANCE, amount: 2500, expenseDate: date('2026-07-18'), method: PaymentMethod.GCASH, payee: 'AquaFix Services', referenceNumber: 'GC-77120' },
    { title: 'Security guard services', category: ExpenseCategory.SALARIES, amount: 5000, expenseDate: date('2026-08-15'), method: PaymentMethod.CASH, payee: 'Ramon Aquino' },
    { title: 'Clubhouse cleaning supplies', category: ExpenseCategory.SUPPLIES, amount: 1850, expenseDate: date('2026-08-12'), method: PaymentMethod.CASH, payee: 'DMCI Hardware' },
  ];

  for (const [index, item] of expenseData.entries()) {
    const { method, ...data } = item;
    await prisma.expense.create({
      data: {
        communityId: community.id,
        createdById: admin.id,
        expenseNumber: `EXP-${String(index + 1).padStart(6, '0')}`,
        paymentMethod: method,
        ...data,
      },
    });
  }

  const utilityExpenseData = [
    { providerName: 'Meralco', utilityType: UtilityType.ELECTRICITY, amount: 2380, expenseDate: date('2026-06-25'), billingPeriod: '2026-06', referenceNumber: 'MRL-66120' },
    { providerName: 'Manila Water', utilityType: UtilityType.WATER, amount: 1650, expenseDate: date('2026-07-22'), billingPeriod: '2026-07', referenceNumber: 'MW-33401' },
    { providerName: 'GreenWaste Solutions', utilityType: UtilityType.GARBAGE, amount: 900, expenseDate: date('2026-07-28'), billingPeriod: '2026-07', referenceNumber: null },
    { providerName: 'Meralco', utilityType: UtilityType.ELECTRICITY, amount: 2420, expenseDate: date('2026-08-20'), billingPeriod: '2026-08', referenceNumber: 'MRL-68455' },
  ];

  for (const [index, item] of utilityExpenseData.entries()) {
    const paymentMethod = item.utilityType === UtilityType.GARBAGE ? PaymentMethod.CASH : PaymentMethod.BANK_TRANSFER;
    await prisma.utilityExpense.create({
      data: {
        communityId: community.id,
        createdById: admin.id,
        utilityNumber: `UTI-${String(index + 1).padStart(6, '0')}`,
        paymentMethod,
        ...item,
      },
    });
  }

  console.log('✅ Expenses & utility bills created');

  // =====================================================
  // WATER READINGS (August 2026)
  // =====================================================

  for (const [index, household] of households.entries()) {
    const previousReading = 118 + index * 7;
    const usage = 8 + ((index * 3) % 17);

    await prisma.utilityReading.create({
      data: {
        communityId: community.id,
        utilityConfigId: waterConfig.id,
        householdId: household.id,
        periodKey: '2026-08',
        previousReading,
        currentReading: previousReading + usage,
        usage,
        readingDate: date('2026-08-01'),
        recordedById: admin.id,
      },
    });
  }

  console.log('✅ Water readings created');

  // =====================================================
  // FACILITIES & RESERVATION
  // =====================================================

  const facilityData = [
    { name: 'Clubhouse Main Hall', type: FacilityType.CLUBHOUSE, description: 'Main clubhouse hall for events and gatherings.', location: 'Phase 1 Clubhouse', capacity: 100, hourlyRate: 500 },
    { name: 'Swimming Pool', type: FacilityType.POOL, description: 'Community swimming pool.', location: 'Phase 1, near the park', capacity: 50, hourlyRate: 200 },
    { name: 'Covered Court', type: FacilityType.COURT, description: 'Multi-purpose covered court for sports.', location: 'Phase 2, open area', capacity: 80, hourlyRate: 150 },
    { name: 'Function Room A', type: FacilityType.FUNCTION_ROOM, description: 'Small function room for meetings and birthdays.', location: 'Clubhouse, 2nd floor', capacity: 30, hourlyRate: 300 },
  ];

  const facilities: { id: string }[] = [];

  for (const item of facilityData) {
    const facility = await prisma.facility.create({
      data: {
        communityId: community.id,
        status: FacilityStatus.AVAILABLE,
        ...item,
      },
    });
    facilities.push(facility);
  }

  await prisma.reservation.create({
    data: {
      communityId: community.id,
      facilityId: facilities[3].id,
      residentId: residents[1].id,
      purpose: "Maria's birthday gathering",
      startAt: date('2026-09-05'),
      endAt: hoursAfter('2026-09-05', 3),
      status: ReservationStatus.APPROVED,
    },
  });

  console.log('✅ Facilities & reservation created');

  // =====================================================
  // BORROWABLE ITEMS
  // =====================================================

  const itemData = [
    { name: 'Monobloc Chair', category: 'CHAIRS', description: 'White monobloc chair.', quantityTotal: 100, borrowFee: null },
    { name: 'Long Table', category: 'TABLES', description: '6-ft plastic long table.', quantityTotal: 20, borrowFee: null },
    { name: 'Canopy Tent (3x3m)', category: 'TENTS', description: 'Foldable canopy tent with frame.', quantityTotal: 6, borrowFee: 150 },
    { name: 'Portable Sound System', category: 'SOUND_SYSTEM', description: 'Speaker with wireless mic; handle with care.', quantityTotal: 2, borrowFee: 300 },
    { name: 'Folding Table (Round)', category: 'TABLES', description: '5-ft round folding table.', quantityTotal: 10, borrowFee: 50 },
  ];

  for (const data of itemData) {
    await prisma.facilityItem.create({
      data: {
        communityId: community.id,
        isActive: true,
        quantityAvailable: data.quantityTotal,
        ...data,
      },
    });
  }

  console.log('✅ Borrowable items created');

  // =====================================================
  // VEHICLES & STICKERS
  // =====================================================

  const vehicleData = [
    { plateNumber: 'ABC-1234', make: 'Toyota', model: 'Vios', color: 'White', type: VehicleType.CAR, residentIndex: 0 },
    { plateNumber: 'XYZ-5678', make: 'Honda', model: 'Civic', color: 'Black', type: VehicleType.CAR, residentIndex: 1 },
    { plateNumber: 'MNO-9012', make: 'Yamaha', model: 'Mio', color: 'Red', type: VehicleType.MOTORCYCLE, residentIndex: 2 },
    { plateNumber: 'QRS-3456', make: 'Toyota', model: 'Fortuner', color: 'Silver', type: VehicleType.CAR, residentIndex: 4 },
  ];

  const vehicles: { id: string }[] = [];

  for (const item of vehicleData) {
    const { residentIndex, ...data } = item;
    const vehicle = await prisma.vehicle.create({
      data: {
        communityId: community.id,
        residentId: residents[residentIndex].id,
        status: VehicleStatus.ACTIVE,
        ...data,
      },
    });
    vehicles.push(vehicle);
  }

  await prisma.vehicleSticker.create({
    data: {
      communityId: community.id,
      vehicleId: vehicles[0].id,
      stickerNumber: 'STK-2026-001',
      issueDate: date('2026-01-15'),
      expirationDate: date('2026-12-31'),
      status: StickerStatus.ACTIVE,
      createdById: admin.id,
      verifiedById: admin.id,
      verifiedAt: date('2026-01-16'),
    },
  });

  await prisma.vehicleSticker.create({
    data: {
      communityId: community.id,
      vehicleId: vehicles[2].id,
      stickerNumber: 'STK-2026-002',
      issueDate: date('2026-08-10'),
      expirationDate: date('2027-08-09'),
      status: StickerStatus.PENDING,
      notes: 'Awaiting OR/CR upload.',
      createdById: admin.id,
    },
  });

  console.log('✅ Vehicles & stickers created');

  // =====================================================
  // PETS
  // =====================================================

  const petData = [
    { petNumber: 'PET-000001', name: 'Bantay', species: PetSpecies.DOG, breed: 'Aspin', sex: 'Male', color: 'Brown', registrationNumber: 'PET-LIC-001', status: PetStatus.ACTIVE, residentIndex: 0, householdIndex: 0 },
    { petNumber: 'PET-000002', name: 'Miming', species: PetSpecies.CAT, breed: 'Persian', sex: 'Female', color: 'White', registrationNumber: 'PET-LIC-002', status: PetStatus.APPROVED, residentIndex: 1, householdIndex: 0 },
    { petNumber: 'PET-000003', name: 'Tweety', species: PetSpecies.BIRD, breed: 'Parakeet', sex: 'Male', color: 'Green', status: PetStatus.PENDING, residentIndex: 3, householdIndex: 2 },
  ];

  for (const item of petData) {
    const { residentIndex, householdIndex, ...data } = item;
    await prisma.pet.create({
      data: {
        communityId: community.id,
        householdId: households[householdIndex].id,
        residentId: residents[residentIndex].id,
        ...data,
      },
    });
  }

  console.log('✅ Pets created');

  // =====================================================
  // STAFF & MAINTENANCE
  // =====================================================

  const staffData = [
    { staffNumber: 'STF-000001', firstName: 'Ramon', lastName: 'Aquino', role: StaffRole.SECURITY, phoneNumber: '09171111111', email: 'ramon.aquino@example.com' },
    { staffNumber: 'STF-000002', firstName: 'Elena', lastName: 'Mercado', role: StaffRole.CLEANING, phoneNumber: '09172222222', email: 'elena.mercado@example.com' },
    { staffNumber: 'STF-000003', firstName: 'Dante', lastName: 'Flores', role: StaffRole.MAINTENANCE, phoneNumber: '09173333333', email: 'dante.flores@example.com' },
  ];

  const staff: { id: string }[] = [];

  for (const item of staffData) {
    const member = await prisma.staff.create({
      data: { communityId: community.id, status: StaffStatus.ACTIVE, ...item },
    });
    staff.push(member);
  }

  const maintenanceData = [
    { maintenanceNumber: 'MNT-000001', title: 'Repair broken streetlight', description: 'Streetlight along Phase 1 entrance is not working.', category: MaintenanceCategory.ELECTRICAL, priority: MaintenancePriority.HIGH, status: MaintenanceStatus.IN_PROGRESS, assignedIndex: 2, scheduledAt: date('2026-08-24') },
    { maintenanceNumber: 'MNT-000002', title: 'Clean clubhouse function rooms', description: 'Deep cleaning of Function Room A after an event.', category: MaintenanceCategory.CLEANING, priority: MaintenancePriority.MEDIUM, status: MaintenanceStatus.OPEN, facilityIndex: 3, scheduledAt: date('2026-08-26') },
    { maintenanceNumber: 'MNT-000003', title: 'Fix leaking pool pump', description: 'Pool pump leaking near the filter area.', category: MaintenanceCategory.FACILITY, priority: MaintenancePriority.URGENT, status: MaintenanceStatus.RESOLVED, assignedIndex: 2, facilityIndex: 1, scheduledAt: date('2026-07-18'), cost: 2500 },
  ];

  for (const item of maintenanceData) {
    const { assignedIndex, facilityIndex, ...data } = item;
    await prisma.maintenance.create({
      data: {
        communityId: community.id,
        assignedToId: assignedIndex !== undefined ? staff[assignedIndex].id : undefined,
        facilityId: facilityIndex !== undefined ? facilities[facilityIndex].id : undefined,
        ...data,
      },
    });
  }

  console.log('✅ Staff & maintenance created');

  // =====================================================
  // VISITORS
  // =====================================================

  const visitorData = [
    { name: 'Andres Bonifacio', phoneNumber: '09174444444', purpose: 'Family visit', hostResidentIndex: 0, status: VisitorStatus.CHECKED_IN, entryAt: date('2026-08-23') },
    { name: 'Jose Rizal', phoneNumber: '09175555555', purpose: 'Food delivery', hostResidentIndex: 2, status: VisitorStatus.EXPECTED, entryAt: date('2026-08-24') },
    { name: 'Corazon Aquino', phoneNumber: '09176666666', purpose: 'Family visit', hostResidentIndex: 1, status: VisitorStatus.CHECKED_OUT, entryAt: date('2026-08-22'), exitAt: date('2026-08-22') },
  ];

  for (const item of visitorData) {
    const { hostResidentIndex, ...data } = item;
    await prisma.visitor.create({
      data: {
        communityId: community.id,
        hostResidentId: residents[hostResidentIndex].id,
        ...data,
      },
    });
  }

  console.log('✅ Visitors created');

  // =====================================================
  // ANNOUNCEMENTS
  // =====================================================

  const announcementData = [
    { title: 'Water Interruption on August 25', content: 'Manila Water will conduct a pipeline maintenance on Tuesday, August 25 from 9:00 AM to 4:00 PM. Please store enough water for the day.', status: AnnouncementStatus.PUBLISHED, publishedAt: date('2026-08-20') },
    { title: 'General Assembly on August 30', content: 'Everyone is invited to the quarterly general assembly at the Clubhouse Main Hall, 2:00 PM. Agenda: 2026 budget review, upcoming projects, and open forum.', status: AnnouncementStatus.PUBLISHED, publishedAt: date('2026-08-18') },
    { title: 'Holiday Bazaar Sponsorship', content: 'Draft guidelines for booth rentals and sponsorships for the December holiday bazaar.', status: AnnouncementStatus.DRAFT },
  ];

  for (const item of announcementData) {
    await prisma.announcement.create({
      data: { communityId: community.id, ...item },
    });
  }

  console.log('✅ Announcements created');

  // =====================================================
  // COMPLAINTS
  // =====================================================

  await prisma.complaint.create({
    data: {
      communityId: community.id,
      residentId: residents[3].id,
      complaintNumber: 'CMP-000001',
      title: 'Barking dogs at night',
      description: 'The dogs next door bark loudly past midnight almost every night.',
      category: ComplaintCategory.PETS,
      priority: ComplaintPriority.MEDIUM,
      status: ComplaintStatus.OPEN,
      assignedToId: admin.id,
    },
  });

  await prisma.complaint.create({
    data: {
      communityId: community.id,
      residentId: residents[2].id,
      complaintNumber: 'CMP-000002',
      title: 'Vehicle blocking driveway',
      description: 'A white sedan has been parked across our driveway for two days.',
      category: ComplaintCategory.PARKING,
      priority: ComplaintPriority.HIGH,
      status: ComplaintStatus.RESOLVED,
      remarks: 'Owner was identified and reminded of parking rules.',
      resolutionRemarks: 'Vehicle moved. Owner advised to use designated visitor parking.',
      resolvedAt: date('2026-07-21'),
    },
  });

  console.log('✅ Complaints created');

  // =====================================================
  // EVENTS
  // =====================================================

  const eventData = [
    { title: 'Community General Assembly', description: 'Quarterly general assembly for all residents.', location: 'Clubhouse Main Hall', startAt: date('2026-08-30'), endAt: hoursAfter('2026-08-30', 3), status: EventStatus.PUBLISHED, attendees: [demoUsers[0], demoUsers[1]] },
    { title: 'Zumba Session', description: 'Weekly community zumba at the covered court.', location: 'Covered Court', startAt: date('2026-08-26'), endAt: hoursAfter('2026-08-26', 1), status: EventStatus.PUBLISHED, attendees: [] },
    { title: 'Holiday Bazaar Planning', description: 'Initial planning meeting for the holiday bazaar.', location: 'Function Room A', startAt: date('2026-09-05'), endAt: hoursAfter('2026-09-05', 2), status: EventStatus.DRAFT, attendees: [] },
  ];

  for (const item of eventData) {
    const { attendees, ...data } = item;
    const event = await prisma.event.create({
      data: { communityId: community.id, organizerId: admin.id, ...data },
    });

    for (const attendee of attendees) {
      await prisma.eventAttendee.create({
        data: { eventId: event.id, userId: attendee.id },
      });
    }
  }

  console.log('✅ Events created');

  // =====================================================
  // POLL
  // =====================================================

  const poll = await prisma.poll.create({
    data: {
      communityId: community.id,
      createdById: admin.id,
      title: 'Should monthly HOA dues be adjusted?',
      description: 'Vote on whether we should review the current monthly dues rate.',
      status: PollStatus.OPEN,
      isAnonymous: false,
      allowMultiple: false,
      allowAddOptions: true,
      startAt: date('2026-08-01'),
      endAt: date('2026-08-31'),
      options: {
        create: [
          { text: 'Keep the current rate' },
          { text: 'Increase by 5%' },
          { text: 'Increase by 10%' },
        ],
      },
    },
    include: { options: true },
  });

  await prisma.pollVote.createMany({
    data: [
      { pollId: poll.id, optionId: poll.options[0].id, userId: demoUsers[0].id },
      { pollId: poll.id, optionId: poll.options[1].id, userId: demoUsers[1].id },
      { pollId: poll.id, optionId: poll.options[0].id, userId: admin.id },
    ],
  });

  console.log('✅ Poll created with sample votes');

  // =====================================================
  // DOCUMENTS
  // =====================================================

  const documentData = [
    { title: 'Community Rules and Regulations', description: 'Official rules and regulations of the HOA.', category: DocumentCategory.POLICY, fileName: 'rules-and-regulations.pdf', mimeType: 'application/pdf', status: DocumentStatus.PUBLISHED },
    { title: 'Board Meeting Minutes - July 2026', description: 'Minutes from the July 2026 board meeting.', category: DocumentCategory.MINUTES, fileName: 'minutes-july-2026.pdf', mimeType: 'application/pdf', status: DocumentStatus.PUBLISHED },
    { title: 'Annual Budget 2026 (Draft)', description: 'Draft of the 2026 annual budget for review.', category: DocumentCategory.FINANCIAL, fileName: 'budget-2026-draft.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', status: DocumentStatus.DRAFT },
  ];

  const uploadsDir = join(process.cwd(), 'uploads');

  try {
    await rm(uploadsDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(
      `⚠️ Could not clear uploads directory (${(err as Error).message}). Continuing...`,
    );
  }
  await mkdir(uploadsDir, { recursive: true });

  for (const item of documentData) {
    const buffer = Buffer.from(
      `CommunityOS placeholder file: ${item.fileName}. Uploaded during database seeding.`,
      'utf-8',
    );

    const storedFilename = `${randomUUID()}-${item.fileName}`;

    await writeFile(join(uploadsDir, storedFilename), buffer);

    const upload = await prisma.upload.create({
      data: {
        communityId: community.id,
        uploadedById: admin.id,
        module: 'document',
        filename: storedFilename,
        originalName: item.fileName,
        mimetype: item.mimeType,
        size: buffer.byteLength,
      },
    });

    await prisma.document.create({
      data: {
        communityId: community.id,
        uploadedById: admin.id,
        title: item.title,
        description: item.description,
        category: item.category,
        status: item.status,
        fileUrl: `/api/uploads/${upload.id}`,
        fileName: item.fileName,
        fileSize: buffer.byteLength,
        mimeType: item.mimeType,
      },
    });
  }

  console.log('✅ Documents created');

  // =====================================================
  // FEATURES
  // =====================================================

  const featureData = [
    {
      code: 'pet-registration',
      name: 'Pet Registration & Management',
      description:
        'Register pets, link them to a household and caretaker, manage verification, certificates, and licenses.',
      type: FeatureType.OPTIONAL,
      dependencies: [] as string[],
      configSchema: {
        required: ['verificationMode'],
        properties: {
          verificationMode: { type: 'string', enum: ['auto', 'approval'] },
          documentsRequired: { type: 'boolean' },
        },
      },
    },
    {
      code: 'good-bad-standing',
      name: 'Good/Bad Standing',
      description:
        'Compute household standing from dues and restrict reserved services for delinquent households.',
      type: FeatureType.OPTIONAL,
      dependencies: [] as string[],
      configSchema: {
        properties: {
          delinquencyThresholdMonths: { type: 'number' },
          restrictedServices: { type: 'array' },
        },
      },
    },
    {
      code: 'construction-management',
      name: 'Construction/Renovation Management',
      description:
        'Manage construction and renovation applications, bonds, and inspections.',
      type: FeatureType.OPTIONAL,
      dependencies: [] as string[],
    },
    {
      code: 'visitor-gate-management',
      name: 'Visitor & Gate Management',
      description:
        'Create visitor invitations, generate passes, and verify visitors at the gate.',
      type: FeatureType.OPTIONAL,
      dependencies: [] as string[],
    },
    {
      code: 'finance-transparency',
      name: 'Finance Transparency',
      description:
        'Expose expense reports, utility bills, and income statements to non-admin members when enabled for a community.',
      type: FeatureType.OPTIONAL,
      dependencies: [] as string[],
    },
    {
      code: 'vehicle-stickers',
      name: 'Vehicle Sticker Management',
      description:
        'Issue and manage vehicle parking stickers with verification, renewal, and status tracking.',
      type: FeatureType.OPTIONAL,
      dependencies: [] as string[],
    },
    {
      code: 'complaints',
      name: 'Complaints & Incidents',
      description:
        'Residents submit complaints, incidents, and service requests with officer assignment and resolution.',
      type: FeatureType.STANDARD,
      dependencies: [] as string[],
    },
    {
      code: 'documents',
      name: 'Documents & Digital Records',
      description:
        'Centralized storage for HOA, household, financial, and pet documents with versioning and audit.',
      type: FeatureType.STANDARD,
      dependencies: [] as string[],
    },
    {
      code: 'events-calendar',
      name: 'Community Calendar & Events',
      description:
        'Publish HOA events, meetings, deadlines, and facility schedules on a shared calendar.',
      type: FeatureType.STANDARD,
      dependencies: [] as string[],
    },
    {
      code: 'reports-analytics',
      name: 'Reports & Analytics',
      description:
        'Operational and financial reporting with filters and Excel/CSV export.',
      type: FeatureType.STANDARD,
      dependencies: ['documents'],
    },
  ];

  const features = new Map<string, string>();

  for (const item of featureData) {
    const feature = await prisma.feature.create({
      data: item,
      select: { id: true, code: true },
    });

    features.set(feature.code, feature.id);
  }

  const optionalFeatureConfigs: Record<string, object> = {
    'pet-registration': {
      verificationMode: 'auto',
      documentsRequired: false,
      rulesUrl: '',
    },
    'good-bad-standing': {
      delinquencyThresholdMonths: 3,
      restrictedServices: ['facility_reservations'],
    },
  };

  // =====================================================
  // PLAN - FEATURE LINKS
  // =====================================================

  // Basic plan: only standard features (complaints, documents, events-calendar, reports-analytics)
  // Standard plan: basic + pet-registration, vehicle-stickers
  // Premium plan: everything
  const planFeatureMap: Record<string, string[]> = {
    [planIds.basic ?? '']: ['complaints', 'documents', 'events-calendar', 'reports-analytics'],
    [planIds.standard ?? '']: ['complaints', 'documents', 'events-calendar', 'reports-analytics', 'pet-registration', 'vehicle-stickers'],
    [planIds.premium ?? '']: ['complaints', 'documents', 'events-calendar', 'reports-analytics', 'pet-registration', 'good-bad-standing', 'vehicle-stickers', 'construction-management', 'visitor-gate-management', 'finance-transparency'],
  };

  for (const [planId, featureCodes] of Object.entries(planFeatureMap)) {
    if (!planId) continue;

    for (const code of featureCodes) {
      const featureId = features.get(code);
      if (!featureId) continue;

      await prisma.planFeature.upsert({
        where: {
          planId_featureId: { planId, featureId },
        },
        update: {},
        create: { planId, featureId },
      });
    }
  }

  console.log('✅ Plan-feature links created');

  for (const [code, config] of Object.entries(optionalFeatureConfigs)) {
    const featureId = features.get(code);
    if (!featureId) continue;

    await prisma.communityFeature.create({
      data: {
        communityId: community.id,
        featureId,
        enabled: true,
        enabledBy: admin.id,
        enabledAt: new Date(),
        config,
      },
    });
  }

  const standardFeatureCodes = ['complaints', 'documents', 'events-calendar', 'reports-analytics'];
  for (const code of standardFeatureCodes) {
    const featureId = features.get(code);
    if (!featureId) continue;

    await prisma.communityFeature.upsert({
      where: {
        communityId_featureId: { communityId: community.id, featureId },
      },
      update: {},
      create: {
        communityId: community.id,
        featureId,
        enabled: true,
        enabledBy: admin.id,
        enabledAt: new Date(),
      },
    });
  }

  console.log('✅ Features created');

  // =====================================================
  // SETTINGS
  // =====================================================

  const settingData = [
    { key: 'communityName', value: 'CommunityOS Demo HOA', group: 'general', isPublic: true },
    { key: 'communityDescription', value: 'Demo community for the CommunityOS platform.', group: 'general', isPublic: true },
    { key: 'contactEmail', value: 'hoa@communityosdemo.com', group: 'general', isPublic: true },
    { key: 'contactNumber', value: '09123456789', group: 'general', isPublic: true },
    { key: 'address', value: '123 Sampaguita Street, Barangay San Isidro, Antipolo City', group: 'general', isPublic: true },
    { key: 'pollReminders', value: true, group: 'notifications', isPublic: false },
    { key: 'eventReminders', value: true, group: 'notifications', isPublic: false },
    { key: 'currency', value: 'PHP', group: 'billing', isPublic: false },
    { key: 'paymentTermsDays', value: 30, group: 'billing', isPublic: false },
  ];

  for (const item of settingData) {
    await prisma.setting.create({
      data: { communityId: community.id, updatedById: admin.id, ...item },
    });
  }

  console.log('✅ Settings created');

  // =====================================================
  // SUBSCRIPTION & INVOICES
  // =====================================================

  const standardPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'community-standard' },
  });

  if (standardPlan) {
    const subscription = await prisma.subscription.create({
      data: {
        communityId: community.id,
        planId: standardPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startsAt: date('2026-06-01'),
        endsAt: date('2026-08-31'),
        autoRenew: true,
      },
    });

    await prisma.invoice.createMany({
      data: [
        { communityId: community.id, subscriptionId: subscription.id, invoiceNumber: 'INV-000001', amount: standardPlan.price, billingCycle: BillingCycle.MONTHLY, status: InvoiceStatus.PAID, dueDate: date('2026-06-05'), paidAt: date('2026-06-03'), paymentMethod: 'bank-transfer', notes: 'June 2026 subscription' },
        { communityId: community.id, subscriptionId: subscription.id, invoiceNumber: 'INV-000002', amount: standardPlan.price, billingCycle: BillingCycle.MONTHLY, status: InvoiceStatus.PAID, dueDate: date('2026-07-05'), paidAt: date('2026-07-04'), paymentMethod: 'bank-transfer', notes: 'July 2026 subscription' },
        { communityId: community.id, subscriptionId: subscription.id, invoiceNumber: 'INV-000003', amount: standardPlan.price, billingCycle: BillingCycle.MONTHLY, status: InvoiceStatus.ISSUED, dueDate: date('2026-08-05'), notes: 'August 2026 subscription' },
      ],
    });

    console.log('✅ Subscription & invoices created');
  }

  // =====================================================
  // LOGIN INFO
  // =====================================================

  console.log('\n===================================');
  console.log(' CommunityOS Demo Accounts');
  console.log('===================================');
  console.log('President      : admin@communityos.com / Admin123!');
  console.log('Vice President : lorna.bautista@example.com / Admin123!');
  console.log('Treasurer      : maria.delacruz@example.com / Admin123!');
  console.log('Secretary      : carlo.mendoza@example.com / Admin123!');
  console.log('Member         : juan.delacruz@example.com / Admin123!');
  console.log('Member         : pedro.reyes@example.com / Admin123!');
  console.log('');
  console.log('  Bad-standing (demo QR rejection):');
  console.log('  Member         : ana.garcia@example.com / Admin123!');
  console.log('  Member         : rosa.villanueva@example.com / Admin123!');
  console.log('  Member         : danilo.aquino@example.com / Admin123!');
  console.log('===================================');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
