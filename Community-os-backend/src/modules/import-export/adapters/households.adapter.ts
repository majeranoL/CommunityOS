import { HouseholdStatus } from '@prisma/client';
import type { ModuleConfig, TemplateField } from '../import-export.types';

const fields: TemplateField[] = [
  {
    key: 'block',
    label: 'Block',
    required: true,
    type: 'string',
    example: 'A',
    description: 'Block number or code',
  },
  {
    key: 'lot',
    label: 'Lot',
    required: true,
    type: 'string',
    example: '12',
    description: 'Lot number',
  },
  {
    key: 'unit',
    label: 'Unit',
    required: false,
    type: 'string',
    example: '3A',
    description: 'Unit number (for condos)',
  },
  {
    key: 'address',
    label: 'Address',
    required: false,
    type: 'string',
    example: '123 Main St',
    description: 'Full address',
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'enum',
    enumValues: Object.values(HouseholdStatus),
    example: 'ACTIVE',
    description: 'ACTIVE or INACTIVE',
  },
];

export const householdsImportConfig: ModuleConfig = {
  module: 'households',
  entityLabel: 'Household',
  importPermission: 'household.import',
  exportPermission: 'household.export',
  import: {
    module: 'households',
    entityLabel: 'Household',
    templateFields: fields,
    duplicateKeys: ['block', 'lot'],
    validateRow: (row) => {
      const errors: string[] = [];
      if (!row.block && !row.lot) errors.push('Block and Lot are required');
      if (
        row.status &&
        !Object.values(HouseholdStatus).includes(row.status.toUpperCase())
      ) {
        errors.push(
          `Invalid status: ${row.status}. Must be ${Object.values(HouseholdStatus).join(', ')}`,
        );
      }
      return errors;
    },
    checkDuplicates: async (communityId, rows, prisma) => {
      const duplicates: { row: number; message: string }[] = [];
      for (const row of rows) {
        if (row.block || row.lot) {
          const existing = await prisma.household.findFirst({
            where: {
              communityId,
              deletedAt: null,
              block: row.block ? String(row.block).trim() : null,
              lot: row.lot ? String(row.lot).trim() : null,
            },
          });
          if (existing) {
            duplicates.push({
              row: row._row,
              message: `Block ${row.block} Lot ${row.lot} already exists`,
            });
          }
        }
      }
      return duplicates;
    },
    applyRows: async (communityId, batchId, rows, ctx) => {
      let created = 0;
      for (const row of rows) {
        const status = Object.values(HouseholdStatus).includes(
          row.status?.toUpperCase(),
        )
          ? row.status.toUpperCase()
          : HouseholdStatus.ACTIVE;
        await ctx.prisma.household.create({
          data: {
            communityId,
            block: row.block ? String(row.block).trim() : null,
            lot: row.lot ? String(row.lot).trim() : null,
            unit: row.unit ? String(row.unit).trim() : null,
            address: row.address?.trim() || null,
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
    module: 'households',
    entityLabel: 'Household',
    columns: [
      { key: 'block', header: 'Block' },
      { key: 'lot', header: 'Lot' },
      { key: 'unit', header: 'Unit' },
      { key: 'address', header: 'Address' },
      { key: 'status', header: 'Status' },
      { key: 'residentCount', header: 'Resident Count' },
      { key: 'createdAt', header: 'Created At' },
    ],
    fetchRows: async (communityId, filters, prisma) => {
      const households = await prisma.household.findMany({
        where: { communityId, deletedAt: null },
        include: {
          _count: { select: { residents: { where: { deletedAt: null } } } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return households.map((h: any) => ({
        block: h.block ?? '',
        lot: h.lot ?? '',
        unit: h.unit ?? '',
        address: h.address ?? '',
        status: h.status,
        residentCount: h._count.residents,
        createdAt: h.createdAt?.toISOString?.() ?? '',
      }));
    },
  },
};
