import {
  PrismaClient,
  CommunityStatus,
  AccountStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Clean database (development only)
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();

  await prisma.userRole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();
  await prisma.role.deleteMany();
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

  // =====================================================
  // PERMISSIONS
  // =====================================================

  const permissions = [
    {
      code: 'resident.create',
      module: 'Residents',
      description: 'Create residents',
    },
    {
      code: 'resident.update',
      module: 'Residents',
      description: 'Update residents',
    },
    {
      code: 'resident.delete',
      module: 'Residents',
      description: 'Delete residents',
    },
    {
      code: 'resident.view',
      module: 'Residents',
      description: 'View residents',
    },

    {
      code: 'announcement.create',
      module: 'Announcements',
      description: 'Create announcements',
    },
    {
      code: 'announcement.update',
      module: 'Announcements',
      description: 'Update announcements',
    },
    {
      code: 'announcement.delete',
      module: 'Announcements',
      description: 'Delete announcements',
    },
    {
      code: 'announcement.publish',
      module: 'Announcements',
      description: 'Publish announcements',
    },

    {
      code: 'billing.create',
      module: 'Billing',
      description: 'Create billing',
    },
    {
      code: 'billing.update',
      module: 'Billing',
      description: 'Update billing',
    },
    {
      code: 'billing.approve',
      module: 'Billing',
      description: 'Approve billing',
    },
    {
      code: 'billing.view',
      module: 'Billing',
      description: 'View billing',
    },

    {
      code: 'user.create',
      module: 'Users',
      description: 'Create users',
    },
    {
      code: 'user.update',
      module: 'Users',
      description: 'Update users',
    },
    {
      code: 'user.delete',
      module: 'Users',
      description: 'Delete users',
    },
    {
      code: 'user.view',
      module: 'Users',
      description: 'View users',
    },

    {
      code: 'role.manage',
      module: 'Roles',
      description: 'Manage roles',
    },
    {
      code: 'permission.manage',
      module: 'Roles',
      description: 'Manage permissions',
    },
  ];

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
  // LOGIN INFO
  // =====================================================

  console.log('\n===================================');
  console.log(' CommunityOS Demo Account');
  console.log('===================================');
  console.log('Email    : admin@communityos.com');
  console.log('Password : Admin123!');
  console.log('===================================');
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });