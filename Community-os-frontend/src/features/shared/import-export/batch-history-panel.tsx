import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useImportBatches, useRollbackImport } from './hooks';

interface BatchHistoryPanelProps {
  module: string;
}

export function BatchHistoryPanel({ module }: BatchHistoryPanelProps) {
  const { data, isLoading } = useImportBatches(module);
  const rollbackMutation = useRollbackImport();

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
    <Card>
      <CardContent className="p-0">
        <ScrollArea className="h-64">
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
                  <TableCell className="text-xs max-w-[150px] truncate">{batch.filename}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        batch.status === 'CONFIRMED'
                          ? 'default'
                          : batch.status === 'ROLLED_BACK' || batch.status === 'CANCELLED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {batch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {batch.processedRows}/{batch.totalRows}
                    {batch.errorRows > 0 && (
                      <span className="text-destructive ml-1">({batch.errorRows} err)</span>
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
                    {batch.status === 'CONFIRMED' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => rollbackMutation.mutate(batch.id)}
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
  );
}
