import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { TableEmptyState } from '@/components/shared/empty-state'

export interface Column<T> {
  key: string
  header: ReactNode
  cell?: (row: T) => ReactNode
  className?: string
  hideBelow?: 'sm' | 'md' | 'lg'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  keyExtractor: (row: T) => string
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyMessage?: string
  dense?: boolean
}

function hideClass(breakpoint?: 'sm' | 'md' | 'lg') {
  switch (breakpoint) {
    case 'sm':
      return 'hidden sm:table-cell'
    case 'md':
      return 'hidden md:table-cell'
    case 'lg':
      return 'hidden lg:table-cell'
    default:
      return ''
  }
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  onRowClick,
  isLoading = false,
  emptyMessage = 'No results found.',
  dense = false,
}: DataTableProps<T>) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                className={`${hideClass(column.hideBelow)} ${column.className ?? ''}`}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={`skeleton-${index}`} className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={`${hideClass(column.hideBelow)} ${column.className ?? ''}`}
                  >
                    <Skeleton className="h-4 w-full max-w-[140px]" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length === 0 ? (
            <TableEmptyState colSpan={columns.length}>{emptyMessage}</TableEmptyState>
          ) : (
            rows.map((row) => (
              <TableRow
                key={keyExtractor(row)}
                className={`${dense ? 'h-10' : ''} ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={
                  onRowClick
                    ? (event) => {
                        const target = event.target as HTMLElement
                        if (
                          target.closest(
                            'button, a, input, textarea, select, [role="button"], [role="menuitem"]',
                          )
                        ) {
                          return
                        }
                        onRowClick(row)
                      }
                    : undefined
                }
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={`${hideClass(column.hideBelow)} ${column.className ?? ''}`}
                  >
                    {column.cell ? column.cell(row) : null}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
