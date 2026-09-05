import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useImportBatches, useRollbackImport } from './hooks';
import type { ImportBatch, ImportBatchStatus } from './types';

interface BatchHistoryPanelProps {
  module: string;
}

function statusVariant(status: ImportBatchStatus): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'COMPLETED':
      return 'default';
    case 'FAILED':
    case 'ROLLED_BACK':
      return 'destructive';
    case 'PROCESSING':
    default:
      return 'secondary';
  }
}

export function BatchHistoryPanel({ module }: BatchHistoryPanelProps) {
  const { data, isLoading } = useImportBatches(module);
  const rollbackMutation = useRollbackImport();
  const [pendingRollback, setPendingRollback] = useState<ImportBatch | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Loading import history...
        </CardContent>
      </Card>
    );
  }

  const batches = data?.items ?? [];

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No import history yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-80">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows</TableHead>
                  <TableHead>Imported By</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="text-xs max-w-[150px] truncate">{batch.fileName}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(batch.status)}>{batch.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {batch.status === 'COMPLETED'
                        ? `${batch.resultCounts.imported ?? 0} imported`
                        : `${batch.resultCounts.valid ?? 0} valid`}
                      {(batch.resultCounts.invalid ?? 0) > 0 && (
                        <span className="text-destructive ml-1">
                          ({batch.resultCounts.invalid} skipped)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {batch.importedBy
                        ? `${batch.importedBy.firstName} ${batch.importedBy.lastName}`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(batch.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {batch.status === 'COMPLETED' && batch.canRollback && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-destructive"
                          onClick={() => setPendingRollback(batch)}
                          disabled={rollbackMutation.isPending}
                        >
                          Rollback
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={Boolean(pendingRollback)} onOpenChange={(open) => !open && setPendingRollback(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback this import?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete all records imported from{' '}
              <span className="font-medium">{pendingRollback?.fileName ?? 'this file'}</span>. This cannot
              be undone by the import tool, though records can be restored by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingRollback) rollbackMutation.mutate(pendingRollback.id);
                setPendingRollback(null);
              }}
            >
              Rollback
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}