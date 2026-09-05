import { PetSpecies, PetStatus } from '@prisma/client';
import type { ModuleConfig, TemplateField } from '../import-export.types';

const fields: TemplateField[] = [
  {
    key: 'name',
    label: 'Pet Name',
    required: true,
    type: 'string',
    example: 'Buddy',
    description: 'Pet name',
  },
  {
    key: 'species',
    label: 'Species',
    required: true,
    type: 'enum',
    enumValues: Object.values(PetSpecies),
    example: 'DOG',
    description: 'DOG, CAT, BIRD, FISH, REPTILE, SMALL_ANIMAL, OTHER',
  },
  {
    key: 'breed',
    label: 'Breed',
    required: false,
    type: 'string',
    example: 'Labrador',
    description: 'Pet breed',
  },
  {
    key: 'sex',
    label: 'Sex',
    required: false,
    type: 'string',
    example: 'Male',
    description: 'Male or Female',
  },
  {
    key: 'color',
    label: 'Color',
    required: false,
    type: 'string',
    example: 'Golden',
    description: 'Pet color',
  },
  {
    key: 'birthDate',
    label: 'Birth Date',
    required: false,
    type: 'date',
    example: '2022-06-15',
    description: 'Date of birth (YYYY-MM-DD)',
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
    key: 'caretakerFirstName',
    label: 'Caretaker First Name',
    required: false,
    type: 'string',
    example: 'Juan',
    description: 'Primary caretaker first name',
  },
  {
    key: 'caretakerLastName',
    label: 'Caretaker Last Name',
    required: false,
    type: 'string',
    example: 'Dela Cruz',
    description: 'Primary caretaker last name',
  },
  {
    key: 'status',
    label: 'Status',
    required: false,
    type: 'enum',
    enumValues: Object.values(PetStatus),
    example: 'ACTIVE',
    description: 'ACTIVE, PENDING, APPROVED, etc.',
  },
];

export const petsImportConfig: ModuleConfig = {
  module: 'pets',
  entityLabel: 'Pet',
  importPermission: 'pet.import',
  exportPermission: 'pet.export',
  import: {
    module: 'pets',
    entityLabel: 'Pet',
    templateFields: fields,
    duplicateKeys: ['name', 'block', 'lot'],
    validateRow: (row) => {
      const errors: string[] = [];
      if (!row.name) errors.push('Pet Name is required');
      if (!row.species) errors.push('Species is required');
      if (!row.block) errors.push('Block is required (to link to household)');
      if (!row.lot) errors.push('Lot is required (to link to household)');
      if (
        row.species &&
        !Object.values(PetSpecies).includes(row.species.toUpperCase())
      ) {
        errors.push(`Invalid species: ${row.species}`);
      }
      if (
        row.status &&
        !Object.values(PetStatus).includes(row.status.toUpperCase())
      ) {
        errors.push(`Invalid status: ${row.status}`);
      }
      return errors;
    },
    checkDuplicates: async (communityId, rows, prisma) => {
      const duplicates: { row: number; message: string }[] = [];
      for (const row of rows) {
        if (row.name && row.block && row.lot) {
          const household = await prisma.household.findFirst({
            where: {
              communityId,
              deletedAt: null,
              block: String(row.block).trim(),
              lot: String(row.lot).trim(),
            },
          });
          if (household) {
            const existing = await prisma.pet.findFirst({
              where: {
                communityId,
                householdId: household.id,
                deletedAt: null,
                name: { equals: String(row.name).trim(), mode: 'insensitive' },
              },
            });
            if (existing) {
              duplicates.push({
                row: row._row,
                message: `Pet "${row.name}" already exists in this household`,
              });
            }
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

        let residentId = null;
        if (row.caretakerfirstname && row.caretakerlastname) {
          const resident = await ctx.prisma.resident.findFirst({
            where: {
              communityId,
              householdId: household.id,
              deletedAt: null,
              firstName: {
                equals: String(row.caretakerfirstname).trim(),
                mode: 'insensitive',
              },
              lastName: {
                equals: String(row.caretakerlastname).trim(),
                mode: 'insensitive',
              },
            },
          });
          if (resident) residentId = resident.id;
        }

        const petNumber = await ctx.prisma.pet.findFirst({
          where: { communityId },
          orderBy: { petNumber: 'desc' },
          select: { petNumber: true },
        });
        let nextNumber = 0;
        if (petNumber) {
          const parsed = parseInt(petNumber.petNumber.replace(/^PET-/, ''), 10);
          if (!Number.isNaN(parsed)) nextNumber = parsed;
        }

        const species =
          row.species &&
          Object.values(PetSpecies).includes(row.species.toUpperCase())
            ? row.species.toUpperCase()
            : PetSpecies.OTHER;
        const status =
          row.status &&
          Object.values(PetStatus).includes(row.status.toUpperCase())
            ? row.status.toUpperCase()
            : PetStatus.ACTIVE;

        await ctx.prisma.pet.create({
          data: {
            communityId,
            householdId: household.id,
            residentId,
            petNumber: `PET-${String(nextNumber + 1).padStart(6, '0')}`,
            name: String(row.name).trim(),
            species,
            breed: row.breed?.trim() || null,
            sex: row.sex?.trim() || null,
            color: row.color?.trim() || null,
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
    module: 'pets',
    entityLabel: 'Pet',
    columns: [
      { key: 'petNumber', header: 'Pet Number' },
      { key: 'name', header: 'Name' },
      { key: 'species', header: 'Species' },
      { key: 'breed', header: 'Breed' },
      { key: 'sex', header: 'Sex' },
      { key: 'color', header: 'Color' },
      { key: 'status', header: 'Status' },
      { key: 'householdBlock', header: 'Block' },
      { key: 'householdLot', header: 'Lot' },
      { key: 'caretakerName', header: 'Caretaker' },
      { key: 'createdAt', header: 'Created At' },
    ],
    fetchRows: async (communityId, filters, prisma) => {
      const where: any = { communityId, deletedAt: null };
      const search = filters?.search;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { breed: { contains: search, mode: 'insensitive' } },
          { petNumber: { contains: search, mode: 'insensitive' } },
          {
            resident: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }
      if (filters?.species) where.species = filters.species;
      if (filters?.status) where.status = filters.status;

      const pets = await prisma.pet.findMany({
        where,
        include: {
          household: { select: { block: true, lot: true } },
          resident: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      return pets.map((p: any) => ({
        petNumber: p.petNumber,
        name: p.name,
        species: p.species,
        breed: p.breed ?? '',
        sex: p.sex ?? '',
        color: p.color ?? '',
        status: p.status,
        householdBlock: p.household?.block ?? '',
        householdLot: p.household?.lot ?? '',
        caretakerName: p.resident
          ? `${p.resident.firstName} ${p.resident.lastName}`
          : '',
        createdAt: p.createdAt?.toISOString?.() ?? '',
      }));
    },
  },
};
