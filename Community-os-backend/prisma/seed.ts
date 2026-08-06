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
  StaffRole,
  StaffStatus,
  MaintenanceCategory,
  MaintenancePriority,
  MaintenanceStatus,
  AssessmentStatus,
  PaymentStatus,
  PaymentMethod,
  DocumentCategory,
  DocumentStatus,
  MessageStatus,
  EventStatus,
  BillingCycle,
  SubscriptionStatus,
  InvoiceStatus,
  PollStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { permissions } from './permissions';
const prisma = new PrismaClient();

async function main() {
  // Clean database (development only)
  await prisma.event.deleteMany();
  await prisma.message.deleteMany();
  await prisma.document.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.maintenance.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.visitor.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.resident.deleteMany();
  await prisma.household.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  await prisma.pollVote.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();

  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();
  await prisma.role.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.community.deleteMany();

  // =====================================================
  // COMMUNITY
  // =====================================================

  const community = await prisma.community.create({
    data: {
      code: 'COMMUNITY001',
      slug: 'community-os-demo',
      displayName: 'CommunityOS Demo HOA',
      email: 'admin@communityos.com',
      contactNumber: '09123456789',
      address: 'Sample Address',
      status: CommunityStatus.ACTIVE,
    },
  });

  console.log('✅ Community created');

  // =====================================================
  // SUBSCRIPTION PLANS
  // =====================================================

  const plans = await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        code: 'community-basic',
        name: 'Community Basic',
        description: 'Essential features for small communities',
        price: 0,
        billingCycle: BillingCycle.MONTHLY,
        features: [
          'Up to 20 households',
          'Complaint management',
          'Event calendar',
          'Community directory',
        ],
        maxUsers: 10,
        maxResidents: 100,
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        code: 'community-standard',
        name: 'Community Standard',
        description: 'Popular plan for growing communities',
        price: 99,
        billingCycle: BillingCycle.MONTHLY,
        features: [
          'Up to 100 households',
          'Facility & amenity booking',
          'Vehicle management',
          'Analytics dashboard',
          'Email notifications',
        ],
        maxUsers: 50,
        maxResidents: 500,
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        code: 'community-premium',
        name: 'Community Premium',
        description: 'Advanced plan with full feature set',
        price: 199,
        billingCycle: BillingCycle.MONTHLY,
        features: [
          'Unlimited households',
          'Maintenance & staff module',
          'Reports & exports',
          'Priority support',
          'Custom branding',
        ],
        maxUsers: 200,
        maxResidents: 2000,
        isActive: true,
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ ${plans.length} subscription plans created`);

  // =====================================================
  // ROLE
  // =====================================================

  const presidentRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'President',
      description: 'Community President',
      isSystem: true,
    },
  });

  console.log('✅ President role created');

  const memberRole = await prisma.role.create({
    data: {
      communityId: community.id,
      name: 'Member',
      description: 'Community Member',
      isSystem: true,
    },
  });

  console.log('✅ Member role created');

  for (const item of permissions) {
    const permission = await prisma.permission.create({
      data: {
        communityId: community.id,
        code: item.code,
        module: item.module,
        description: item.description,
      },
    });

    await prisma.rolePermission.create({
      data: {
        roleId: presidentRole.id,
        permissionId: permission.id,
      },
    });
  }

  console.log('✅ Permissions created');

  const memberPermissionCodes = [
    'message.create',
    'message.view',
    'message.update',
    'message.delete',
    'event.view',
    'document.view',
    'assessment.view',
    'payment.view',
    'announcement.view',
    'complaint.create',
    'complaint.view',
    'facility.view',
    'reservation.create',
    'reservation.view',
    'notification.view',
    'notification.update',
    'poll.view',
    'poll.vote',
    'settings.view',
  ];

  for (const code of memberPermissionCodes) {
    const permission = await prisma.permission.findFirst({
      where: {
        communityId: community.id,
        code,
      },
    });

    if (permission) {
      await prisma.rolePermission.create({
        data: {
          roleId: memberRole.id,
          permissionId: permission.id,
        },
      });
    }
  }

  console.log('✅ Member permissions assigned');

  // =====================================================
  // ACCOUNT
  // =====================================================

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const account = await prisma.account.create({
    data: {
      email: 'admin@communityos.com',
      passwordHash,
      status: AccountStatus.ACTIVE,
    },
  });

  console.log('✅ Account created');

  // =====================================================
  // USER
  // =====================================================

  const user = await prisma.user.create({
    data: {
      accountId: account.id,
      communityId: community.id,

      referenceNumber: 'USR-000001',

      firstName: 'System',
      lastName: 'Administrator',

      status: UserStatus.ACTIVE,
    },
  });

  console.log('✅ User created');

  // =====================================================
  // USER ROLE
  // =====================================================

  await prisma.userRole.create({
    data: {
      userId: user.id,
      roleId: presidentRole.id,
    },
  });

  console.log('✅ Role assigned');

  // =====================================================
  // SAMPLE DATA
  // =====================================================

  await seedSampleData(community.id, user.id, memberRole.id);

  console.log('✅ Sample data created');

  // =====================================================
  // LOGIN INFO
  // =====================================================

  console.log('\n===================================');
  console.log(' CommunityOS Demo Account');
  console.log('===================================');
  console.log('Email    : admin@communityos.com');
  console.log('Password : Admin123!');
  console.log('===================================');
}

// =====================================================
// SAMPLE DATA
// =====================================================

async function seedSampleData(
  communityId: string,
  userId: string,
  memberRoleId: string,
) {
  // =====================================================
  // HOUSEHOLDS
  // =====================================================

  const householdData = [
    { block: 'A', lot: '1', address: 'Block A, Lot 1' },
    { block: 'A', lot: '2', address: 'Block A, Lot 2' },
    { block: 'B', lot: '3', address: 'Block B, Lot 3' },
    { block: 'B', lot: '4', address: 'Block B, Lot 4' },
    { block: 'C', lot: '5', address: 'Block C, Lot 5' },
  ];

  const households: {
    id: string;
  }[] = [];

  for (const item of householdData) {
    const household = await prisma.household.create({
      data: {
        communityId,
        ...item,
        status: HouseholdStatus.ACTIVE,
      },
    });

    households.push(household);
  }

  console.log('✅ Households created');

  // =====================================================
  // RESIDENTS
  // =====================================================

  const residentData = [
    {
      residentNumber: 'RES-000001',
      firstName: 'Juan',
      middleName: 'Santos',
      lastName: 'Dela Cruz',
      gender: Gender.MALE,
      civilStatus: CivilStatus.MARRIED,
      phoneNumber: '09171234567',
      email: 'juan.delacruz@example.com',
      householdIndex: 0,
    },
    {
      residentNumber: 'RES-000002',
      firstName: 'Maria',
      middleName: 'Lopez',
      lastName: 'Dela Cruz',
      gender: Gender.FEMALE,
      civilStatus: CivilStatus.MARRIED,
      phoneNumber: '09171234568',
      email: 'maria.delacruz@example.com',
      householdIndex: 0,
    },
    {
      residentNumber: 'RES-000003',
      firstName: 'Pedro',
      lastName: 'Reyes',
      gender: Gender.MALE,
      civilStatus: CivilStatus.SINGLE,
      phoneNumber: '09171234569',
      email: 'pedro.reyes@example.com',
      householdIndex: 1,
    },
    {
      residentNumber: 'RES-000004',
      firstName: 'Ana',
      lastName: 'Garcia',
      gender: Gender.FEMALE,
      civilStatus: CivilStatus.SINGLE,
      phoneNumber: '09171234570',
      email: 'ana.garcia@example.com',
      householdIndex: 2,
    },
  ];

  const residents: {
    id: string;
  }[] = [];

  for (const item of residentData) {
    const { householdIndex, ...data } = item;

    const resident = await prisma.resident.create({
      data: {
        communityId,
        householdId: households[householdIndex].id,
        status: ResidentStatus.ACTIVE,
        ...data,
      },
    });

    residents.push(resident);
  }

  console.log('✅ Residents created');

  // =====================================================
  // FACILITIES
  // =====================================================

  const facilityData = [
    {
      name: 'Clubhouse Main Hall',
      type: FacilityType.CLUBHOUSE,
      description: 'Main clubhouse hall for events and gatherings.',
      location: 'Phase 1 Clubhouse',
      capacity: 100,
      hourlyRate: 500,
    },
    {
      name: 'Swimming Pool',
      type: FacilityType.POOL,
      description: 'Community swimming pool.',
      location: 'Phase 1, near the park',
      capacity: 50,
      hourlyRate: 200,
    },
    {
      name: 'Covered Court',
      type: FacilityType.COURT,
      description: 'Multi-purpose covered court for sports.',
      location: 'Phase 2, open area',
      capacity: 80,
      hourlyRate: 150,
    },
    {
      name: 'Function Room A',
      type: FacilityType.FUNCTION_ROOM,
      description: 'Small function room for meetings and birthdays.',
      location: 'Clubhouse, 2nd floor',
      capacity: 30,
      hourlyRate: 300,
    },
  ];

  const facilities: {
    id: string;
  }[] = [];

  for (const item of facilityData) {
    const facility = await prisma.facility.create({
      data: {
        communityId,
        status: FacilityStatus.AVAILABLE,
        ...item,
      },
    });

    facilities.push(facility);
  }

  console.log('✅ Facilities created');

  // =====================================================
  // VEHICLES
  // =====================================================

  const vehicleData = [
    {
      plateNumber: 'ABC-1234',
      make: 'Toyota',
      model: 'Vios',
      color: 'White',
      type: VehicleType.CAR,
      residentIndex: 0,
    },
    {
      plateNumber: 'XYZ-5678',
      make: 'Honda',
      model: 'Civic',
      color: 'Black',
      type: VehicleType.CAR,
      residentIndex: 1,
    },
    {
      plateNumber: 'MNO-9012',
      make: 'Yamaha',
      model: 'Mio',
      color: 'Red',
      type: VehicleType.MOTORCYCLE,
      residentIndex: 2,
    },
  ];

  const vehicles: {
    id: string;
  }[] = [];

  for (const item of vehicleData) {
    const { residentIndex, ...data } = item;

    const vehicle = await prisma.vehicle.create({
      data: {
        communityId,
        residentId: residents[residentIndex].id,
        status: VehicleStatus.ACTIVE,
        ...data,
      },
    });

    vehicles.push(vehicle);
  }

  console.log('✅ Vehicles created');

  // =====================================================
  // STAFF
  // =====================================================

  const staffData = [
    {
      staffNumber: 'STF-000001',
      firstName: 'Ramon',
      lastName: 'Aquino',
      role: StaffRole.SECURITY,
      phoneNumber: '09171111111',
      email: 'ramon.aquino@example.com',
    },
    {
      staffNumber: 'STF-000002',
      firstName: 'Elena',
      lastName: 'Mercado',
      role: StaffRole.CLEANING,
      phoneNumber: '09172222222',
      email: 'elena.mercado@example.com',
    },
    {
      staffNumber: 'STF-000003',
      firstName: 'Dante',
      lastName: 'Flores',
      role: StaffRole.MAINTENANCE,
      phoneNumber: '09173333333',
      email: 'dante.flores@example.com',
    },
  ];

  const staff: {
    id: string;
  }[] = [];

  for (const item of staffData) {
    const member = await prisma.staff.create({
      data: {
        communityId,
        status: StaffStatus.ACTIVE,
        ...item,
      },
    });

    staff.push(member);
  }

  console.log('✅ Staff created');

  // =====================================================
  // VISITORS
  // =====================================================

  const visitorData = [
    {
      name: 'Andres Bonifacio',
      phoneNumber: '09174444444',
      purpose: 'Family visit',
      hostResidentIndex: 0,
      vehicleIndex: 0,
      status: VisitorStatus.CHECKED_IN,
      entryAt: new Date('2026-08-06T09:00:00.000Z'),
    },
    {
      name: 'Jose Rizal',
      phoneNumber: '09175555555',
      purpose: 'Delivery',
      hostResidentIndex: 2,
      status: VisitorStatus.EXPECTED,
    },
  ];

  for (const item of visitorData) {
    const { hostResidentIndex, vehicleIndex, ...data } = item;

    await prisma.visitor.create({
      data: {
        communityId,
        hostResidentId: residents[hostResidentIndex].id,
        vehicleId:
          vehicleIndex !== undefined ? vehicles[vehicleIndex].id : undefined,
        ...data,
      },
    });
  }

  console.log('✅ Visitors created');

  // =====================================================
  // MAINTENANCE
  // =====================================================

  const maintenanceData = [
    {
      maintenanceNumber: 'MNT-000001',
      title: 'Repair broken streetlight',
      description: 'Streetlight along Phase 1 entrance is not working.',
      category: MaintenanceCategory.ELECTRICAL,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.IN_PROGRESS,
      assignedIndex: 2,
      scheduledAt: new Date('2026-08-07T08:00:00.000Z'),
    },
    {
      maintenanceNumber: 'MNT-000002',
      title: 'Clean clubhouse function rooms',
      description: 'Deep cleaning of Function Room A after an event.',
      category: MaintenanceCategory.CLEANING,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.OPEN,
      facilityIndex: 3,
      scheduledAt: new Date('2026-08-08T10:00:00.000Z'),
    },
    {
      maintenanceNumber: 'MNT-000003',
      title: 'Fix leaking pool pump',
      description: 'Pool pump leaking near the filter area.',
      category: MaintenanceCategory.FACILITY,
      priority: MaintenancePriority.URGENT,
      status: MaintenanceStatus.ASSIGNED,
      assignedIndex: 2,
      facilityIndex: 1,
      scheduledAt: new Date('2026-08-06T14:00:00.000Z'),
      cost: 2500,
    },
  ];

  for (const item of maintenanceData) {
    const { assignedIndex, facilityIndex, ...data } = item;

    await prisma.maintenance.create({
      data: {
        communityId,
        assignedToId:
          assignedIndex !== undefined ? staff[assignedIndex].id : undefined,
        facilityId:
          facilityIndex !== undefined
            ? facilities[facilityIndex].id
            : undefined,
        ...data,
      },
    });
  }

  console.log('✅ Maintenance created');

  // =====================================================
  // ASSESSMENTS
  // =====================================================

  const assessmentData = [
    {
      assessmentNumber: 'ASS-000001',
      title: 'HOA Dues - August 2026',
      description: 'Monthly association dues for August 2026.',
      amount: 1200,
      dueDate: new Date('2026-08-31T00:00:00.000Z'),
      period: '2026-08',
      status: AssessmentStatus.ISSUED,
      householdIndex: 0,
    },
    {
      assessmentNumber: 'ASS-000002',
      title: 'HOA Dues - August 2026',
      description: 'Monthly association dues for August 2026.',
      amount: 1200,
      dueDate: new Date('2026-08-31T00:00:00.000Z'),
      period: '2026-08',
      status: AssessmentStatus.ISSUED,
      householdIndex: 1,
    },
    {
      assessmentNumber: 'ASS-000003',
      title: 'Special Assessment - Gate Repairs',
      description: 'One-time assessment for main gate repairs.',
      amount: 2500,
      dueDate: new Date('2026-09-15T00:00:00.000Z'),
      period: '2026-09',
      status: AssessmentStatus.ISSUED,
      householdIndex: 2,
      paidAmount: 2500,
    },
  ];

  const assessments: {
    id: string;
  }[] = [];

  for (const item of assessmentData) {
    const { householdIndex, ...data } = item;

    const assessment = await prisma.assessment.create({
      data: {
        communityId,
        householdId: households[householdIndex].id,
        ...data,
      },
    });

    assessments.push(assessment);
  }

  console.log('✅ Assessments created');

  // =====================================================
  // PAYMENTS
  // =====================================================

  const paymentData = [
    {
      paymentNumber: 'PAY-000001',
      amount: 1200,
      paymentDate: new Date('2026-08-05T10:00:00.000Z'),
      method: PaymentMethod.GCASH,
      referenceNumber: 'GC-884123',
      status: PaymentStatus.CONFIRMED,
      assessmentIndex: 0,
      residentIndex: 0,
    },
    {
      paymentNumber: 'PAY-000002',
      amount: 2500,
      paymentDate: new Date('2026-08-05T14:30:00.000Z'),
      method: PaymentMethod.BANK_TRANSFER,
      referenceNumber: 'BT-220191',
      status: PaymentStatus.CONFIRMED,
      assessmentIndex: 2,
      residentIndex: 3,
    },
    {
      paymentNumber: 'PAY-000003',
      amount: 1200,
      paymentDate: new Date('2026-08-06T09:00:00.000Z'),
      method: PaymentMethod.CASH,
      status: PaymentStatus.PENDING,
      assessmentIndex: 1,
      residentIndex: 2,
    },
  ];

  for (const item of paymentData) {
    const { assessmentIndex, residentIndex, ...data } = item;

    await prisma.payment.create({
      data: {
        communityId,
        assessmentId: assessments[assessmentIndex].id,
        residentId: residents[residentIndex].id,
        ...data,
      },
    });
  }

  console.log('✅ Payments created');

  // =====================================================
  // DOCUMENTS
  // =====================================================

  const documentData = [
    {
      title: 'Community Rules and Regulations',
      description: 'Official rules and regulations of the HOA.',
      category: DocumentCategory.POLICY,
      fileUrl: '/uploads/documents/rules-and-regulations.pdf',
      fileName: 'rules-and-regulations.pdf',
      fileSize: 245760,
      mimeType: 'application/pdf',
      status: DocumentStatus.PUBLISHED,
    },
    {
      title: 'Board Meeting Minutes - July 2026',
      description: 'Minutes from the July 2026 board meeting.',
      category: DocumentCategory.MINUTES,
      fileUrl: '/uploads/documents/minutes-july-2026.pdf',
      fileName: 'minutes-july-2026.pdf',
      fileSize: 143360,
      mimeType: 'application/pdf',
      status: DocumentStatus.PUBLISHED,
    },
    {
      title: 'Annual Budget 2026 (Draft)',
      description: 'Draft of the 2026 annual budget for review.',
      category: DocumentCategory.FINANCIAL,
      fileUrl: '/uploads/documents/budget-2026-draft.xlsx',
      fileName: 'budget-2026-draft.xlsx',
      fileSize: 38912,
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      status: DocumentStatus.DRAFT,
    },
  ];

  for (const item of documentData) {
    await prisma.document.create({
      data: {
        communityId,
        uploadedById: userId,
        ...item,
      },
    });
  }

  console.log('✅ Documents created');

  // =====================================================
  // DEMO USERS (for messaging)
  // =====================================================

  const demoUserData = [
    {
      referenceNumber: 'USR-000002',
      email: 'juan.delacruz@example.com',
      firstName: 'Juan',
      lastName: 'Dela Cruz',
    },
    {
      referenceNumber: 'USR-000003',
      email: 'pedro.reyes@example.com',
      firstName: 'Pedro',
      lastName: 'Reyes',
    },
  ];

  const demoPasswordHash = await bcrypt.hash('Admin123!', 10);

  const demoUsers: {
    id: string;
  }[] = [];

  for (const item of demoUserData) {
    const account = await prisma.account.create({
      data: {
        email: item.email,
        passwordHash: demoPasswordHash,
        status: AccountStatus.ACTIVE,
      },
    });

    const user = await prisma.user.create({
      data: {
        accountId: account.id,
        communityId,
        referenceNumber: item.referenceNumber,
        firstName: item.firstName,
        lastName: item.lastName,
        status: UserStatus.ACTIVE,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId: memberRoleId,
      },
    });

    demoUsers.push(user);
  }

  console.log('✅ Demo users created');

  // =====================================================
  // MESSAGES
  // =====================================================

  const messageData = [
    {
      subject: 'Reminder: August dues are due',
      body: 'Please settle your August 2026 association dues on or before August 31.',
      recipientIndex: 0,
      status: MessageStatus.READ,
      sentAt: new Date('2026-08-01T08:00:00.000Z'),
      readAt: new Date('2026-08-01T09:30:00.000Z'),
    },
    {
      subject: 'Water interruption advisory',
      body: 'There will be a water interruption on Saturday from 8:00 AM to 12:00 PM.',
      recipientIndex: 1,
      status: MessageStatus.DELIVERED,
      sentAt: new Date('2026-08-04T16:00:00.000Z'),
    },
    {
      subject: 'General community announcement',
      body: 'Welcome to the new CommunityOS portal! All announcements will be posted here.',
      status: MessageStatus.SENT,
      sentAt: new Date('2026-08-02T10:00:00.000Z'),
    },
  ];

  for (const item of messageData) {
    const { recipientIndex, ...data } = item;

    await prisma.message.create({
      data: {
        communityId,
        senderId: userId,
        recipientId:
          recipientIndex !== undefined
            ? demoUsers[recipientIndex].id
            : undefined,
        ...data,
      },
    });
  }

  console.log('✅ Messages created');

  // =====================================================
  // EVENTS
  // =====================================================

  const eventData = [
    {
      title: 'Community General Assembly',
      description: 'Quarterly general assembly for all residents.',
      location: 'Clubhouse Main Hall',
      startAt: new Date('2026-08-20T14:00:00.000Z'),
      endAt: new Date('2026-08-20T17:00:00.000Z'),
      status: EventStatus.PUBLISHED,
    },
    {
      title: 'Zumba Session',
      description: 'Weekly community zumba at the covered court.',
      location: 'Covered Court',
      startAt: new Date('2026-08-15T06:00:00.000Z'),
      endAt: new Date('2026-08-15T07:00:00.000Z'),
      status: EventStatus.PUBLISHED,
    },
    {
      title: 'Holiday Bazaar (Planning)',
      description: 'Initial planning meeting for the holiday bazaar.',
      location: 'Function Room A',
      startAt: new Date('2026-09-05T10:00:00.000Z'),
      endAt: new Date('2026-09-05T11:30:00.000Z'),
      status: EventStatus.DRAFT,
    },
  ];

  for (const item of eventData) {
    await prisma.event.create({
      data: {
        communityId,
        organizerId: userId,
        ...item,
      },
    });
  }

  console.log('✅ Events created');

  // =====================================================
  // POLLS
  // =====================================================

  const poll = await prisma.poll.create({
    data: {
      communityId,
      createdById: userId,
      title: 'Should monthly HOA dues be adjusted?',
      description:
        'Vote on whether we should review the current monthly dues rate.',
      status: PollStatus.OPEN,
      isAnonymous: false,
      allowMultiple: false,
      allowAddOptions: true,
      startAt: new Date('2026-08-01T00:00:00.000Z'),
      endAt: new Date('2026-08-31T23:59:59.000Z'),

      options: {
        create: [
          { text: 'Keep the current rate' },
          { text: 'Increase by 5%' },
          { text: 'Increase by 10%' },
        ],
      },
    },

    include: {
      options: true,
    },
  });

  await prisma.pollVote.createMany({
    data: [
      {
        pollId: poll.id,
        optionId: poll.options[0].id,
        userId: demoUsers[0].id,
      },
      {
        pollId: poll.id,
        optionId: poll.options[1].id,
        userId: demoUsers[1].id,
      },
    ],
  });

  console.log('✅ Poll created with sample votes');

  // =====================================================
  // SETTINGS
  // =====================================================

  const settingData = [
    {
      key: 'communityName',
      value: 'CommunityOS Demo HOA',
      group: 'general',
      isPublic: true,
    },
    {
      key: 'communityDescription',
      value: 'Demo community for the CommunityOS platform.',
      group: 'general',
      isPublic: true,
    },
    {
      key: 'contactEmail',
      value: 'admin@communityos.com',
      group: 'general',
      isPublic: true,
    },
    {
      key: 'contactNumber',
      value: '09123456789',
      group: 'general',
      isPublic: true,
    },
    {
      key: 'address',
      value: 'Sample Address',
      group: 'general',
      isPublic: true,
    },
    {
      key: 'pollReminders',
      value: true,
      group: 'notifications',
      isPublic: false,
    },
    {
      key: 'eventReminders',
      value: true,
      group: 'notifications',
      isPublic: false,
    },
    {
      key: 'currency',
      value: 'PHP',
      group: 'billing',
      isPublic: false,
    },
    {
      key: 'paymentTermsDays',
      value: 30,
      group: 'billing',
      isPublic: false,
    },
  ];

  for (const item of settingData) {
    await prisma.setting.create({
      data: {
        communityId,
        updatedById: userId,
        ...item,
      },
    });
  }

  console.log('✅ Settings created');

  // =====================================================
  // SUBSCRIPTION & INVOICE
  // =====================================================

  const standardPlan = await prisma.subscriptionPlan.findUnique({
    where: { code: 'community-standard' },
  });

  if (standardPlan) {
    const subscription = await prisma.subscription.create({
      data: {
        communityId,
        planId: standardPlan.id,
        status: SubscriptionStatus.ACTIVE,
        startsAt: new Date('2026-07-01T00:00:00.000Z'),
        endsAt: new Date('2026-07-31T23:59:59.000Z'),
        autoRenew: true,
      },
    });

    console.log('✅ Demo subscription created');

    await prisma.invoice.create({
      data: {
        communityId,
        subscriptionId: subscription.id,
        invoiceNumber: 'INV-000001',
        amount: standardPlan.price,
        billingCycle: BillingCycle.MONTHLY,
        status: InvoiceStatus.PAID,
        dueDate: new Date('2026-07-05T00:00:00.000Z'),
        paidAt: new Date('2026-07-03T10:00:00.000Z'),
        paymentMethod: 'bank-transfer',
        notes: 'July 2026 subscription',
      },
    });

    await prisma.invoice.create({
      data: {
        communityId,
        subscriptionId: subscription.id,
        invoiceNumber: 'INV-000002',
        amount: standardPlan.price,
        billingCycle: BillingCycle.MONTHLY,
        status: InvoiceStatus.ISSUED,
        dueDate: new Date('2026-08-05T00:00:00.000Z'),
        notes: 'August 2026 subscription',
      },
    });

    console.log('✅ Invoices created');
  }
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
