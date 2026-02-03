/**
 * Generic data table.
 *
 * Designed for fast iteration:
 * - Column definitions are simple (header + accessor)
 * - Supports a loading skeleton state that matches the eventual table layout
 * - Emits `data-testid` hooks for rows using `getRowKey`
 *
 * AI iteration notes:
 * - Use `accessor: (item) => <CustomCell />` for rich cells.
 * - Keep `getRowKey` stable (prefer a DB id) to avoid React re-mount churn.
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Column<T> {
  header: string;
  accessor: keyof T | ((item: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  getRowKey: (item: T) => string;
}

export function DataTable<T>({
  columns,
  data,
  isLoading,
  onRowClick,
  emptyMessage = "No data available",
  getRowKey,
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i} className={col.className}>
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow
              key={getRowKey(item)}
              className={onRowClick ? "cursor-pointer hover-elevate" : ""}
              onClick={() => onRowClick?.(item)}
              data-testid={`row-${getRowKey(item)}`}
            >
              {columns.map((col, j) => (
                <TableCell key={j} className={col.className}>
                  {typeof col.accessor === "function"
                    ? col.accessor(item)
                    : (item[col.accessor] as React.ReactNode)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
