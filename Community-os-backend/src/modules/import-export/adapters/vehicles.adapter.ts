import { VehicleType, VehicleStatus } from '@prisma/client';
import type { ModuleConfig, TemplateField } from '../import-export.types';

const fields: TemplateField[] = [
  {
    key: 'plateNumber',
    label: 'Plate Number',
    required: true,
    type: 'string',
    example: 'ABC 1234',
    description: 'Vehicle plate number',
  },
  {
    key: 'make',
    label: 'Make',
    required: false,
    type: 'string',
    example: 'Toyota',
    description: 'Vehicle make/brand',
  },
  {
    key: 'model',
    label: 'Model',
    required: false,
    type: 'string',
    example: 'Vios',
    description: 'Vehicle model',
  },
  {
    key: 'color',
    label: 'Color',
    required: false,
    type: 'string',
    example: 'White',
    description: 'Vehicle color',
  },
  {
    key: 'type',
    label: 'Type',
    required: false,
    type: 'enum',
    enumValues: Object.values(VehicleType),
    example: 'CAR',
    description: 'CAR, MOTORCYCLE, TRUCK, VAN, BICYCLE, OTHER',
  },
  {
    key: 'block',
    label: 'Block',
    required: true,
    type: 'string',
    example: 'A',
    description: 'Block of owner household',
  },
  {
    key: 'lot',
    label: 'Lot',
    required: true,
    type: 'string',
    example: '12',
    description: 'Lot of owner household',
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'enum',
    enumValues: Object.values(VehicleStatus),
    example: 'ACTIVE',
    description: 'ACTIVE, PENDING, APPROVED, etc.',
  },
];

export const vehiclesImportConfig: ModuleConfig = {
  module: 'vehicles',
  entityLabel: 'Vehicle',
  importPermission: 'vehicle.import',
  exportPermission: 'vehicle.export',
  import: {
    module: 'vehicles',
    entityLabel: 'Vehicle',
    templateFields: fields,
    duplicateKeys: ['plateNumber'],
    validateRow: (row) => {
      const errors: string[] = [];
      if (!row.platenumber) errors.push('Plate Number is required');
      if (!row.block) errors.push('Block is required (to link to household)');
      if (!row.lot) errors.push('Lot is required (to link to household)');
      if (
        row.type &&
        !Object.values(VehicleType).includes(row.type.toUpperCase())
      ) {
        errors.push(`Invalid vehicle type: ${row.type}`);
      }
      if (
        row.status &&
        !Object.values(VehicleStatus).includes(row.status.toUpperCase())
      ) {
        errors.push(`Invalid status: ${row.status}`);
      }
      return errors;
    },
    checkDuplicates: async (communityId, rows, prisma) => {
      const duplicates: { row: number; message: string }[] = [];
      for (const row of rows) {
        if (row.platenumber) {
          const existing = await prisma.vehicle.findFirst({
            where: {
              communityId,
              deletedAt: null,
              plateNumber: {
                equals: String(row.platenumber).trim(),
                mode: 'insensitive',
              },
            },
          });
          if (existing) {
            duplicates.push({
              row: row._row,
              message: `Vehicle "${row.platenumber}" already exists`,
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
          include: { residents: { where: { deletedAt: null }, take: 1 } },
        });

        const type =
          row.type &&
          Object.values(VehicleType).includes(row.type.toUpperCase())
            ? row.type.toUpperCase()
            : VehicleType.CAR;
        const status =
          row.status &&
          Object.values(VehicleStatus).includes(row.status.toUpperCase())
            ? row.status.toUpperCase()
            : VehicleStatus.ACTIVE;

        await ctx.prisma.vehicle.create({
          data: {
            communityId,
            residentId: household?.residents[0]?.id ?? null,
            plateNumber: String(row.platenumber).trim(),
            make: row.make?.trim() || null,
            model: row.model?.trim() || null,
            color: row.color?.trim() || null,
            type,
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
    module: 'vehicles',
    entityLabel: 'Vehicle',
    columns: [
      { key: 'plateNumber', header: 'Plate Number' },
      { key: 'make', header: 'Make' },
      { key: 'model', header: 'Model' },
      { key: 'color', header: 'Color' },
      { key: 'type', header: 'Type' },
      { key: 'status', header: 'Status' },
      { key: 'ownerName', header: 'Owner' },
      { key: 'block', header: 'Block' },
      { key: 'lot', header: 'Lot' },
      { key: 'createdAt', header: 'Created At' },
    ],
    fetchRows: async (communityId, _filters, prisma) => {
      const vehicles = await prisma.vehicle.findMany({
        where: { communityId, deletedAt: null },
        include: {
          resident: {
            select: {
              firstName: true,
              lastName: true,
              household: { select: { block: true, lot: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      return vehicles.map((v: any) => ({
        plateNumber: v.plateNumber,
        make: v.make ?? '',
        model: v.model ?? '',
        color: v.color ?? '',
        type: v.type,
        status: v.status,
        ownerName: v.resident
          ? `${v.resident.firstName} ${v.resident.lastName}`
          : '',
        block: v.resident?.household?.block ?? '',
        lot: v.resident?.household?.lot ?? '',
        createdAt: v.createdAt?.toISOString?.() ?? '',
      }));
    },
  },
};
