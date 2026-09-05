import { describe, expect, it, vi, beforeEach } from 'vitest'

const { apiGet, apiPost } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  default: {
    get: apiGet,
    post: apiPost,
  },
}))

import { importExportService } from './service'

beforeEach(() => {
  apiGet.mockReset()
  apiPost.mockReset()
})

describe('importExportService.getSchema', () => {
  it('requests the module schema endpoint', async () => {
    apiGet.mockResolvedValue({
      data: {
        data: { module: 'households', templateFields: [], exportColumns: [] },
      },
    })

    const schema = await importExportService.getSchema('households')

    expect(apiGet).toHaveBeenCalledWith('/import-export/schemas/households')
    expect(schema.module).toBe('households')
  })
})

describe('importExportService.confirm', () => {
  it('sends selected row indices to confirm', async () => {
    apiPost.mockResolvedValue({
      data: { data: { created: 2, total: 2, batchId: 'batch-1' } },
    })

    await importExportService.confirm('batch-1', [2, 4])

    expect(apiPost).toHaveBeenCalledWith('/import-export/import/batch-1/confirm', {
      rowIndices: [2, 4],
    })
  })

  it('sends an empty body when no rows are selected', async () => {
    apiPost.mockResolvedValue({ data: { data: { created: 0, total: 0, batchId: 'batch-1' } } })

    await importExportService.confirm('batch-1')

    expect(apiPost).toHaveBeenCalledWith('/import-export/import/batch-1/confirm', {
      rowIndices: undefined,
    })
  })
})

describe('importExportService.exportData', () => {
  it('passes format, columns and filters as query params', async () => {
    apiGet.mockResolvedValue({ data: new Blob(['csv']) })

    await importExportService.exportData(
      'vehicles',
      'csv',
      ['plateNumber', 'make'],
      { status: 'ACTIVE', type: 'CAR' },
    )

    expect(apiGet).toHaveBeenCalledWith('/import-export/export/vehicles', {
      params: {
        format: 'csv',
        columns: 'plateNumber,make',
        status: 'ACTIVE',
        type: 'CAR',
      },
      responseType: 'blob',
    })
  })

  it('omits filters when scope is all records', async () => {
    apiGet.mockResolvedValue({ data: new Blob(['csv']) })

    await importExportService.exportData('vehicles', 'csv', ['plateNumber'])

    expect(apiGet).toHaveBeenCalledWith('/import-export/export/vehicles', {
      params: {
        format: 'csv',
        columns: 'plateNumber',
      },
      responseType: 'blob',
    })
  })
})