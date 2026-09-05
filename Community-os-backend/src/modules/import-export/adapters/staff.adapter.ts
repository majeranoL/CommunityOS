import { StaffRole, StaffStatus } from '@prisma/client';
import type { ModuleConfig, TemplateField } from '../import-export.types';

const fields: TemplateField[] = [
  {
    key: 'firstName',
    label: 'First Name',
    required: true,
    type: 'string',
    example: 'Pedro',
    description: 'Staff first name',
  },
  {
    key: 'lastName',
    label: 'Last Name',
    required: true,
    type: 'string',
    example: 'Santos',
    description: 'Staff last name',
  },
  {
    key: 'middleName',
    label: 'Middle Name',
    required: false,
    type: 'string',
    example: 'Reyes',
    description: 'Middle name',
  },
  {
    key: 'role',
    label: 'Role',
    required: false,
    type: 'enum',
    enumValues: Object.values(StaffRole),
    example: 'SECURITY',
    description: 'SECURITY, MAINTENANCE, CLEANING, ADMIN, OTHER',
  },
  {
    key: 'phoneNumber',
    label: 'Phone Number',
    required: false,
    type: 'string',
    example: '09171234567',
    description: 'Contact number',
  },
  {
    key: 'email',
    label: 'Email',
    required: false,
    type: 'string',
    example: 'pedro@example.com',
    description: 'Email address',
  },
  {
    key: 'hireDate',
    label: 'Hire Date',
    required: false,
    type: 'date',
    example: '2024-01-15',
    description: 'Date hired (YYYY-MM-DD)',
  },
  {
    key: 'notes',
    label: 'Notes',
    required: false,
    type: 'string',
    example: 'Night shift security',
    description: 'Additional notes',
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'enum',
    enumValues: Object.values(StaffStatus),
    example: 'ACTIVE',
    description: 'ACTIVE or INACTIVE',
  },
];

export const staffImportConfig: ModuleConfig = {
  module: 'staff',
  entityLabel: 'Staff',
  importPermission: 'staff.import',
  exportPermission: 'staff.export',
  import: {
    module: 'staff',
    entityLabel: 'Staff',
    templateFields: fields,
    duplicateKeys: ['firstName', 'lastName'],
    validateRow: (row) => {
      const errors: string[] = [];
      if (!row.firstname) errors.push('First Name is required');
      if (!row.lastname) errors.push('Last Name is required');
      if (
        row.role &&
        !Object.values(StaffRole).includes(row.role.toUpperCase())
      ) {
        errors.push(`Invalid role: ${row.role}`);
      }
      if (
        row.status &&
        !Object.values(StaffStatus).includes(row.status.toUpperCase())
      ) {
        errors.push(`Invalid status: ${row.status}`);
      }
      return errors;
    },
    checkDuplicates: async (communityId, rows, prisma) => {
      const duplicates: { row: number; message: string }[] = [];
      for (const row of rows) {
        if (row.firstname && row.lastname) {
          const existing = await prisma.staff.findFirst({
            where: {
              communityId,
              deletedAt: null,
              firstName: {
                equals: String(row.firstname).trim(),
                mode: 'insensitive',
              },
              lastName: {
                equals: String(row.lastname).trim(),
                mode: 'insensitive',
              },
            },
          });
          if (existing) {
            duplicates.push({
              row: row._row,
              message: `Staff "${row.firstname} ${row.lastname}" already exists`,
            });
          }
        }
      }
      return duplicates;
    },
    applyRows: async (communityId, batchId, rows, ctx) => {
      let created = 0;
      for (const row of rows) {
        const staffNumber = await ctx.prisma.staff.findFirst({
          where: { communityId },
          orderBy: { staffNumber: 'desc' },
          select: { staffNumber: true },
        });
        let nextNumber = 0;
        if (staffNumber) {
          const parsed = parseInt(
            staffNumber.staffNumber.replace(/^STF-/, ''),
            10,
          );
          if (!Number.isNaN(parsed)) nextNumber = parsed;
        }

        const role =
          row.role && Object.values(StaffRole).includes(row.role.toUpperCase())
            ? row.role.toUpperCase()
            : StaffRole.SECURITY;
        const status =
          row.status &&
          Object.values(StaffStatus).includes(row.status.toUpperCase())
            ? row.status.toUpperCase()
            : StaffStatus.ACTIVE;

        await ctx.prisma.staff.create({
          data: {
            communityId,
            staffNumber: `STF-${String(nextNumber + 1).padStart(6, '0')}`,
            firstName: String(row.firstname).trim(),
            lastName: String(row.lastname).trim(),
            middleName: row.middlename?.trim() || null,
            role,
            phoneNumber: row.phonenumber?.trim() || null,
            email: row.email?.trim() || null,
            hireDate: row.hiredate ? new Date(row.hiredate) : null,
            notes: row.notes?.trim() || null,
            status,
            isImported: true,
            importBatchId: batchId,
          },
        });
        created++;
      }
      return created;
    },
  },
  export: {
    module: 'staff',
    entityLabel: 'Staff',
    columns: [
      { key: 'staffNumber', header: 'Staff Number' },
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'middleName', header: 'Middle Name' },
      { key: 'role', header: 'Role' },
      { key: 'phoneNumber', header: 'Phone Number' },
      { key: 'email', header: 'Email' },
      { key: 'hireDate', header: 'Hire Date' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Created At' },
    ],
    fetchRows: async (communityId, filters, prisma) => {
      const where: any = { communityId, deletedAt: null };
      const search = filters?.search;
      if (search) {
        where.OR = [
          { staffNumber: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { middleName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
        ];
      }
      if (filters?.role) where.role = filters.role;
      if (filters?.status) where.status = filters.status;

      const staff = await prisma.staff.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return staff.map((s: any) => ({
        staffNumber: s.staffNumber,
        firstName: s.firstName,
        lastName: s.lastName,
        middleName: s.middleName ?? '',
        role: s.role,
        phoneNumber: s.phoneNumber ?? '',
        email: s.email ?? '',
        hireDate: s.hireDate?.toISOString?.()?.slice(0, 10) ?? '',
        status: s.status,
        createdAt: s.createdAt?.toISOString?.() ?? '',
      }));
    },
  },
};
