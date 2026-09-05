import {
  ResidentStatus,
  Gender,
  CivilStatus,
  ResidentType,
} from '@prisma/client';
import type { ModuleConfig, TemplateField } from '../import-export.types';

const fields: TemplateField[] = [
  {
    key: 'firstName',
    label: 'First Name',
    required: true,
    type: 'string',
    example: 'Juan',
    description: 'Resident first name',
  },
  {
    key: 'lastName',
    label: 'Last Name',
    required: true,
    type: 'string',
    example: 'Dela Cruz',
    description: 'Resident last name',
  },
  {
    key: 'middleName',
    label: 'Middle Name',
    required: false,
    type: 'string',
    example: 'Santos',
    description: 'Middle name',
  },
  {
    key: 'suffix',
    label: 'Suffix',
    required: false,
    type: 'string',
    example: 'Jr.',
    description: 'Name suffix (Jr., Sr., III, etc.)',
  },
  {
    key: 'block',
    label: 'Block',
    required: true,
    type: 'string',
    example: 'A',
    description: 'Block of household',
  },
  {
    key: 'lot',
    label: 'Lot',
    required: true,
    type: 'string',
    example: '12',
    description: 'Lot of household',
  },
  {
    key: 'unit',
    label: 'Unit',
    required: false,
    type: 'string',
    example: '3A',
    description: 'Unit of household (for condos)',
  },
  {
    key: 'gender',
    label: 'Gender',
    required: false,
    type: 'enum',
    enumValues: Object.values(Gender),
    example: 'MALE',
    description: 'MALE, FEMALE, or OTHER',
  },
  {
    key: 'civilStatus',
    label: 'Civil Status',
    required: false,
    type: 'enum',
    enumValues: Object.values(CivilStatus),
    example: 'SINGLE',
    description: 'SINGLE, MARRIED, WIDOWED, DIVORCED, SEPARATED',
  },
  {
    key: 'residentType',
    label: 'Resident Type',
    required: false,
    type: 'enum',
    enumValues: Object.values(ResidentType),
    example: 'OWNER',
    description: 'OWNER or RENTER',
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
    example: 'juan@example.com',
    description: 'Email address',
  },
  {
    key: 'birthDate',
    label: 'Birth Date',
    required: false,
    type: 'date',
    example: '1990-01-15',
    description: 'Date of birth (YYYY-MM-DD)',
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'enum',
    enumValues: Object.values(ResidentStatus),
    example: 'ACTIVE',
    description: 'ACTIVE, PENDING, INACTIVE',
  },
];

export const residentsImportConfig: ModuleConfig = {
  module: 'residents',
  entityLabel: 'Resident',
  importPermission: 'resident.import',
  exportPermission: 'resident.export',
  import: {
    module: 'residents',
    entityLabel: 'Resident',
    templateFields: fields,
    duplicateKeys: ['firstName', 'lastName', 'block', 'lot'],
    validateRow: (row) => {
      const errors: string[] = [];
      if (!row.firstname) errors.push('First Name is required');
      if (!row.lastname) errors.push('Last Name is required');
      if (!row.block) errors.push('Block is required (to link to household)');
      if (!row.lot) errors.push('Lot is required (to link to household)');
      if (
        row.gender &&
        !Object.values(Gender).includes(row.gender.toUpperCase())
      ) {
        errors.push(`Invalid gender: ${row.gender}`);
      }
      if (
        row.civilstatus &&
        !Object.values(CivilStatus).includes(row.civilstatus.toUpperCase())
      ) {
        errors.push(`Invalid civil status: ${row.civilstatus}`);
      }
      if (
        row.residenttype &&
        !Object.values(ResidentType).includes(row.residenttype.toUpperCase())
      ) {
        errors.push(`Invalid resident type: ${row.residenttype}`);
      }
      if (
        row.status &&
        !Object.values(ResidentStatus).includes(row.status.toUpperCase())
      ) {
        errors.push(`Invalid status: ${row.status}`);
      }
      if (row.birthdate && Number.isNaN(Date.parse(row.birthdate))) {
        errors.push('Invalid birth date format. Use YYYY-MM-DD.');
      }
      return errors;
    },
    checkDuplicates: async (communityId, rows, prisma) => {
      const duplicates: { row: number; message: string }[] = [];
      for (const row of rows) {
        if (row.firstname && row.lastname) {
          const existing = await prisma.resident.findFirst({
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
              message: `Resident "${row.firstname} ${row.lastname}" already exists`,
            });
          }
        }
      }
      return duplicates;
    },
    applyRows: async (communityId, batchId, rows, ctx) => {
      let created = 0;
      for (const row of rows) {
        const household = await ctx.prisma.household.findFirst({
          where: {
            communityId,
            deletedAt: null,
            block: row.block ? String(row.block).trim() : null,
            lot: row.lot ? String(row.lot).trim() : null,
          },
        });

        if (!household) continue;

        const residentNumber = await ctx.prisma.resident.findFirst({
          where: { communityId },
          orderBy: { residentNumber: 'desc' },
          select: { residentNumber: true },
        });
        let nextNumber = 0;
        if (residentNumber) {
          const parsed = parseInt(
            residentNumber.residentNumber.replace(/^RES-/, ''),
            10,
          );
          if (!Number.isNaN(parsed)) nextNumber = parsed;
        }

        const gender =
          row.gender && Object.values(Gender).includes(row.gender.toUpperCase())
            ? row.gender.toUpperCase()
            : null;
        const civilStatus =
          row.civilstatus &&
          Object.values(CivilStatus).includes(row.civilstatus.toUpperCase())
            ? row.civilstatus.toUpperCase()
            : null;
        const residentType =
          row.residenttype &&
          Object.values(ResidentType).includes(row.residenttype.toUpperCase())
            ? row.residenttype.toUpperCase()
            : ResidentType.OWNER;
        const status =
          row.status &&
          Object.values(ResidentStatus).includes(row.status.toUpperCase())
            ? row.status.toUpperCase()
            : ResidentStatus.ACTIVE;

        await ctx.prisma.resident.create({
          data: {
            communityId,
            householdId: household.id,
            residentNumber: `RES-${String(nextNumber + 1).padStart(6, '0')}`,
            firstName: String(row.firstname).trim(),
            lastName: String(row.lastname).trim(),
            middleName: row.middlename?.trim() || null,
            suffix: row.suffix?.trim() || null,
            gender,
            civilStatus,
            residentType,
            phoneNumber: row.phonenumber?.trim() || null,
            email: row.email?.trim() || null,
            birthDate: row.birthdate ? new Date(row.birthdate) : null,
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
    module: 'residents',
    entityLabel: 'Resident',
    columns: [
      { key: 'residentNumber', header: 'Resident Number' },
      { key: 'firstName', header: 'First Name' },
      { key: 'lastName', header: 'Last Name' },
      { key: 'middleName', header: 'Middle Name' },
      { key: 'block', header: 'Block' },
      { key: 'lot', header: 'Lot' },
      { key: 'gender', header: 'Gender' },
      { key: 'civilStatus', header: 'Civil Status' },
      { key: 'residentType', header: 'Resident Type' },
      { key: 'phoneNumber', header: 'Phone Number' },
      { key: 'email', header: 'Email' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Created At' },
    ],
    fetchRows: async (communityId, filters, prisma) => {
      const where: any = { communityId, deletedAt: null };
      const search = filters?.search;
      if (search) {
        where.OR = [
          { residentNumber: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { middleName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
        ];
      }
      if (filters?.status) where.status = filters.status;
      if (filters?.gender) where.gender = filters.gender;

      const residents = await prisma.resident.findMany({
        where,
        include: {
          household: { select: { block: true, lot: true, unit: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return residents.map((r: any) => ({
        residentNumber: r.residentNumber,
        firstName: r.firstName,
        lastName: r.lastName,
        middleName: r.middleName ?? '',
        block: r.household?.block ?? '',
        lot: r.household?.lot ?? '',
        gender: r.gender ?? '',
        civilStatus: r.civilStatus ?? '',
        residentType: r.residentType ?? '',
        phoneNumber: r.phoneNumber ?? '',
        email: r.email ?? '',
        status: r.status,
        createdAt: r.createdAt?.toISOString?.() ?? '',
      }));
    },
  },
};
