import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './bootstrap-app';
import { provisionCommunity } from './test-helpers';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Str0ng!Pass';

const HOUSEHOLDS_MAPPING = {
  block: 'block',
  lot: 'lot',
  unit: 'unit',
  address: 'address',
  status: 'status',
};

function csv(header: string, ...rows: string[]): Buffer {
  return Buffer.from([header, ...rows].join('\n'), 'utf-8');
}

function textParser() {
  return (res: any, cb: (err: Error | null, body: string) => void) => {
    const chunks: Buffer[] = [];
    (res as NodeJS.ReadableStream).on('data', (c: Buffer) => chunks.push(c));
    (res as NodeJS.ReadableStream).on('end', () =>
      cb(null, Buffer.concat(chunks).toString('utf8')),
    );
  };
}

function csvLines(text: string): string[] {
  return text
    .replace(/"/g, '')
    .trim()
    .split(/[\r\n]+/);
}

function teamName(base: string): string {
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function householdCount(prisma: PrismaService, communityId: string) {
  return prisma.household.count({ where: { communityId } });
}

describe('Import/Export flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists modules, exposes schemas, and downloads a template', async () => {
    const { accessToken } = await provisionCommunity(
      app,
      teamName('IE Modules'),
      {
        firstName: 'Mod',
        lastName: 'User',
        email: `ie-modules-${Date.now()}@example.com`,
        password: PASSWORD,
      },
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const modules = await request(app.getHttpServer())
      .get('/api/import-export/modules')
      .set(headers);
    expect(modules.status).toBe(200);
    expect(modules.body.data.map((m: any) => m.module)).toContain('households');

    const schema = await request(app.getHttpServer())
      .get('/api/import-export/schemas/households')
      .set(headers);
    expect(schema.status).toBe(200);
    expect(schema.body.data.templateFields.length).toBeGreaterThan(0);
    expect(schema.body.data.exportColumns.map((c: any) => c.key)).toContain(
      'block',
    );

    const template = await request(app.getHttpServer())
      .get('/api/import-export/template/households?format=csv')
      .set(headers)
      .buffer(true)
      .parse(textParser());
    expect(template.status).toBe(200);
    expect(csvLines(template.body)[0]).toBe('Block,Lot,Unit,Address,Status');
  });

  it('detect mode returns headers, auto-mapping and a sample without creating a batch', async () => {
    const { accessToken } = await provisionCommunity(
      app,
      teamName('IE Detect'),
      {
        firstName: 'Det',
        lastName: 'User',
        email: `ie-detect-${Date.now()}@example.com`,
        password: PASSWORD,
      },
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const res = await request(app.getHttpServer())
      .post('/api/import-export/import/households/preview')
      .set(headers)
      .attach(
        'file',
        csv(
          'Block,Lot,Unit,Address,Status',
          'A,1,101,123 Main St,ACTIVE',
          'B,2,102,456 Oak Ave,INACTIVE',
          'C,3,103,789 Pine Rd,ACTIVE',
        ),
        'households.csv',
      );

    expect(res.status).toBe(201);
    expect(res.body.data.batchId).toBeUndefined();
    expect(res.body.data.sourceHeaders).toEqual([
      'block',
      'lot',
      'unit',
      'address',
      'status',
    ]);
    expect(res.body.data.autoMapping).toEqual(HOUSEHOLDS_MAPPING);
    expect(res.body.data.totalRows).toBe(3);
    expect(res.body.data.sample).toHaveLength(3);
    expect(res.body.data.templateFields.map((t: any) => t.key)).toEqual([
      'block',
      'lot',
      'unit',
      'address',
      'status',
    ]);
  });

  it('mapped preview creates a batch and returns all rows with counts', async () => {
    const { accessToken } = await provisionCommunity(
      app,
      teamName('IE Preview'),
      {
        firstName: 'Prev',
        lastName: 'User',
        email: `ie-preview-${Date.now()}@example.com`,
        password: PASSWORD,
      },
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const res = await request(app.getHttpServer())
      .post('/api/import-export/import/households/preview')
      .set(headers)
      .attach(
        'file',
        csv(
          'Block,Lot,Unit,Address,Status',
          'A,1,101,123 Main St,ACTIVE',
          'B,2,102,456 Oak Ave,INACTIVE',
          'C,3,103,789 Pine Rd,ACTIVE',
        ),
        'households.csv',
      )
      .field('columnMapping', JSON.stringify(HOUSEHOLDS_MAPPING));

    expect(res.status).toBe(201);
    expect(res.body.data.batchId).toBeDefined();
    expect(res.body.data.totalRows).toBe(3);
    expect(res.body.data.validRows).toBe(3);
    expect(res.body.data.invalidRows).toBe(0);
    expect(res.body.data.rows).toHaveLength(3);
    expect(res.body.data.rows[0]._row).toBe(2);
    expect(res.body.data.preview).toHaveLength(3);
    expect(res.body.data.columns.map((c: any) => c.key)).toEqual([
      'block',
      'lot',
      'unit',
      'address',
      'status',
    ]);

    await prisma.importBatch.deleteMany({
      where: { id: res.body.data.batchId },
    });
  });

  it('confirms a subset of rows, records counts, and lists history', async () => {
    const { accessToken, community } = await provisionCommunity(
      app,
      teamName('IE Confirm'),
      {
        firstName: 'Conf',
        lastName: 'User',
        email: `ie-confirm-${Date.now()}@example.com`,
        password: PASSWORD,
      },
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const preview = await request(app.getHttpServer())
      .post('/api/import-export/import/households/preview')
      .set(headers)
      .attach(
        'file',
        csv(
          'Block,Lot,Unit,Address,Status',
          'A,1,101,123 Main St,ACTIVE',
          'B,2,102,456 Oak Ave,INACTIVE',
          'C,3,103,789 Pine Rd,ACTIVE',
        ),
        'households.csv',
      )
      .field('columnMapping', JSON.stringify(HOUSEHOLDS_MAPPING));
    const batchId = preview.body.data.batchId as string;
    expect(preview.status).toBe(201);

    const confirm = await request(app.getHttpServer())
      .post(`/api/import-export/import/${batchId}/confirm`)
      .set(headers)
      .send({ rowIndices: [2, 4] });
    expect(confirm.status).toBe(201);
    expect(confirm.body.data.created).toBe(2);
    expect(confirm.body.data.total).toBe(2);

    expect(await householdCount(prisma, community.id)).toBe(2);
    const live = await prisma.household.findMany({
      where: { communityId: community.id, deletedAt: null },
      orderBy: { block: 'asc' },
    });
    expect(live.map((h) => h.block)).toEqual(['A', 'C']);

    const history = await request(app.getHttpServer())
      .get('/api/import-export/batches?module=households')
      .set(headers);
    expect(history.status).toBe(200);
    expect(history.body.data[0].id).toBe(batchId);
    expect(history.body.data[0].status).toBe('COMPLETED');
    expect(history.body.data[0].canRollback).toBe(true);
    expect(history.body.data[0].importedBy.firstName).toBe('Conf');
    expect(history.body.data[0].resultCounts.imported).toBe(2);
    expect(history.body.data[0].resultCounts.valid).toBe(3);
    expect(history.body.data[0].resultCounts.total).toBe(3);
  });

  it('exports the chosen columns and respects the status filter, then rollback removes the records', async () => {
    const { accessToken, community } = await provisionCommunity(
      app,
      teamName('IE Export'),
      {
        firstName: 'Exp',
        lastName: 'User',
        email: `ie-export-${Date.now()}@example.com`,
        password: PASSWORD,
      },
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const importBatch = async (file: Buffer) => {
      const preview = await request(app.getHttpServer())
        .post('/api/import-export/import/households/preview')
        .set(headers)
        .attach('file', file, 'households.csv')
        .field('columnMapping', JSON.stringify(HOUSEHOLDS_MAPPING));
      const batchId = preview.body.data.batchId as string;
      const confirm = await request(app.getHttpServer())
        .post(`/api/import-export/import/${batchId}/confirm`)
        .set(headers);
      expect(confirm.status).toBe(201);
      return { batchId, created: confirm.body.data.created as number };
    };

    const first = await importBatch(
      csv(
        'Block,Lot,Unit,Address,Status',
        'A,1,101,123 Main St,ACTIVE',
        'B,2,102,456 Oak Ave,INACTIVE',
        'C,3,103,789 Pine Rd,ACTIVE',
      ),
    );
    expect(first.created).toBe(3);

    const second = await importBatch(
      csv(
        'Block,Lot,Unit,Address,Status',
        'X,9,901,North St,ACTIVE',
        'Y,9,902,South St,INACTIVE',
      ),
    );
    expect(second.created).toBe(2);

    const filtered = await request(app.getHttpServer())
      .get(
        '/api/import-export/export/households?format=csv&columns=block,status&status=ACTIVE',
      )
      .set(headers)
      .buffer(true)
      .parse(textParser());
    expect(filtered.status).toBe(200);
    expect(filtered.headers['content-disposition']).toContain('attachment');
    const filteredLines = csvLines(filtered.body);
    expect(filteredLines[0]).toBe('Block,Status');
    expect(filteredLines.slice(1).sort()).toEqual([
      'A,ACTIVE',
      'C,ACTIVE',
      'X,ACTIVE',
    ]); // ACTIVE only, blocks A, C, X
    expect(filteredLines.some((l: string) => l.includes('B,ACTIVE'))).toBe(
      false,
    );
    expect(filteredLines.some((l: string) => l.includes('INACTIVE'))).toBe(
      false,
    );

    const all = await request(app.getHttpServer())
      .get(
        '/api/import-export/export/households?format=csv&columns=block,lot,status',
      )
      .set(headers)
      .buffer(true)
      .parse(textParser());
    const allLines = csvLines(all.body);
    expect(allLines[0]).toBe('Block,Lot,Status');
    expect(allLines).toContain('Y,9,INACTIVE');
    expect(allLines).toContain('X,9,ACTIVE');

    const rollback = await request(app.getHttpServer())
      .post(`/api/import-export/import/${first.batchId}/rollback`)
      .set(headers);
    expect(rollback.status).toBe(201);
    expect(rollback.body.success).toBe(true);

    const liveAfter = await prisma.household.findMany({
      where: { communityId: community.id, deletedAt: null },
      orderBy: { block: 'asc' },
    });
    expect(liveAfter.map((h) => h.block)).toEqual(['X', 'Y']);

    const secondRollback = await request(app.getHttpServer())
      .post(`/api/import-export/import/${first.batchId}/rollback`)
      .set(headers);
    expect(secondRollback.status).toBe(400);

    const history = await request(app.getHttpServer())
      .get(`/api/import-export/batches?module=households`)
      .set(headers);
    const rolled = history.body.data.find((b: any) => b.id === first.batchId);
    expect(rolled.status).toBe('ROLLED_BACK');

    const afterRollback = await request(app.getHttpServer())
      .get(
        '/api/import-export/export/households?format=csv&columns=block,status',
      )
      .set(headers)
      .buffer(true)
      .parse(textParser());
    const afterRollbackLines = csvLines(afterRollback.body);
    expect(afterRollbackLines[0]).toBe('Block,Status');
    expect(afterRollbackLines.slice(1).sort()).toEqual([
      'X,ACTIVE',
      'Y,INACTIVE',
    ]);
  });

  it('rejects empty confirmations, cancels pending batches, and flags invalid rows', async () => {
    const { accessToken, community } = await provisionCommunity(
      app,
      teamName('IE Guard'),
      {
        firstName: 'Grd',
        lastName: 'User',
        email: `ie-guard-${Date.now()}@example.com`,
        password: PASSWORD,
      },
    );
    const headers = { Authorization: `Bearer ${accessToken}` };

    const create = await request(app.getHttpServer())
      .post('/api/import-export/import/households/preview')
      .set(headers)
      .attach(
        'file',
        csv('Block,Lot,Unit,Address,Status', 'V,1,301,Valid St,ACTIVE'),
        'households.csv',
      )
      .field('columnMapping', JSON.stringify(HOUSEHOLDS_MAPPING));
    const pendingId = create.body.data.batchId as string;

    const empty = await request(app.getHttpServer())
      .post(`/api/import-export/import/${pendingId}/confirm`)
      .set(headers)
      .send({ rowIndices: [] });
    expect(empty.status).toBe(400);

    const cancelled = await request(app.getHttpServer())
      .post(`/api/import-export/import/${pendingId}/cancel`)
      .set(headers);
    expect(cancelled.status).toBe(201);

    const confirmAfterCancel = await request(app.getHttpServer())
      .post(`/api/import-export/import/${pendingId}/confirm`)
      .set(headers);
    expect(confirmAfterCancel.status).toBe(400);
    expect(await householdCount(prisma, community.id)).toBe(0);

    const bad = await request(app.getHttpServer())
      .post('/api/import-export/import/households/preview')
      .set(headers)
      .attach(
        'file',
        csv(
          'Block,Lot,Unit,Address,Status',
          'W,1,401,Weird Rd,ACTIVE',
          'Z,1,402,Bad Rd,TOTALLY_BOGUS',
        ),
        'households.csv',
      )
      .field('columnMapping', JSON.stringify(HOUSEHOLDS_MAPPING));
    expect(bad.body.data.validRows).toBe(1);
    expect(bad.body.data.invalidRows).toBe(1);
    const badRow = bad.body.data.rows.find((r: any) => r._row === 3);
    expect(badRow.errors).toHaveLength(1);

    const badBatchId = bad.body.data.batchId as string;
    const confirmValid = await request(app.getHttpServer())
      .post(`/api/import-export/import/${badBatchId}/confirm`)
      .set(headers);
    expect(confirmValid.status).toBe(201);
    expect(confirmValid.body.data.created).toBe(1);
    const imported = await prisma.household.findFirst({
      where: { communityId: community.id, deletedAt: null },
    });
    expect(imported!.block).toBe('W');

    const errors = await request(app.getHttpServer())
      .get(`/api/import-export/errors/${badBatchId}`)
      .set(headers)
      .buffer(true)
      .parse(textParser());
    expect(errors.status).toBe(200);
    expect(errors.body).toContain('TOTALLY_BOGUS');
  });
});
