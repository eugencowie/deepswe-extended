import { useMemo, useState } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/components/ui/utils";
import { compareBlankLast, compareModel, type SortDirection } from "@/data/derive";
import { formatInteger, formatPassAt1, formatTokens, formatUsd } from "@/data/format";
import type { LeaderboardRow } from "@/data/types";

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, LeaderboardRow>();

const columns = helper.columns([
  helper.accessor("displayName", {
    id: "model",
    header: "Model",
    cell: ({ row }) => (
      <>
        {row.original.displayName}
        {row.original.effort !== null && (
          <span className="text-muted-foreground"> [{row.original.effort}]</span>
        )}
      </>
    ),
  }),
  helper.accessor("passAt1", {
    id: "passAt1",
    header: "Pass@1",
    cell: ({ row }) => formatPassAt1(row.original.passAt1),
  }),
  helper.accessor("effectiveCostUsd", {
    id: "avgCost",
    header: "Avg cost",
    cell: ({ row }) => formatUsd(row.original.effectiveCostUsd),
  }),
  helper.accessor("costPerSolvedTaskUsd", {
    id: "costPerf",
    header: "Cost/perf",
    cell: ({ row }) => formatUsd(row.original.costPerSolvedTaskUsd),
  }),
  helper.accessor("outputTokens", {
    id: "outTok",
    header: "Out tok",
    cell: ({ row }) => formatTokens(row.original.outputTokens),
  }),
  helper.accessor("steps", {
    id: "steps",
    header: "Steps",
    cell: ({ row }) => formatInteger(row.original.steps),
  }),
]);

// Sorting lives outside TanStack: its sorted row model reverses comparator
// results for descending order, which would put blank cells first. These
// comparators receive the direction instead, so blanks sort last both ways.
type ColumnSort = {
  compare: (a: LeaderboardRow, b: LeaderboardRow, direction: SortDirection) => number;
  firstDirection: SortDirection;
};

const numericSort = (value: (row: LeaderboardRow) => number | null): ColumnSort => ({
  compare: (a, b, direction) => compareBlankLast(value(a), value(b), direction),
  firstDirection: "desc",
});

const columnSorts: Record<string, ColumnSort> = {
  model: {
    compare: (a, b, direction) => (direction === "asc" ? compareModel(a, b) : compareModel(b, a)),
    firstDirection: "asc",
  },
  passAt1: numericSort((row) => row.passAt1),
  avgCost: numericSort((row) => row.effectiveCostUsd),
  costPerf: numericSort((row) => row.costPerSolvedTaskUsd),
  outTok: numericSort((row) => row.outputTokens),
  steps: numericSort((row) => row.steps),
};

const headerTooltips: Record<string, string> = {
  costPerf: "Avg cost ÷ Pass@1: what you pay per task actually solved",
};

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const [sort, setSort] = useState<{ columnId: string; direction: SortDirection }>({
    columnId: "passAt1",
    direction: "desc",
  });

  const sortedRows = useMemo(() => {
    const { compare } = columnSorts[sort.columnId];
    return rows.toSorted((a, b) => compare(a, b, sort.direction));
  }, [rows, sort]);

  const table = useTable({ features, columns, data: sortedRows });

  // Two-state toggle: a sorted column flips direction, a fresh column starts
  // in its natural direction. There is no unsorted state.
  const toggleSort = (columnId: string) => {
    setSort((current) =>
      current.columnId === columnId
        ? { columnId, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId, direction: columnSorts[columnId].firstDirection },
    );
  };

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {group.headers.map((header) => {
              const isSorted = sort.columnId === header.column.id;
              const tooltip = headerTooltips[header.column.id];
              const label = (
                <span className={cn(tooltip && "underline decoration-dotted underline-offset-4")}>
                  <table.FlexRender header={header} />
                </span>
              );
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(header.column.id !== "model" && "text-right")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(header.column.id)}
                    className="inline-flex cursor-pointer items-center gap-1 font-medium"
                  >
                    {tooltip ? (
                      <Tooltip>
                        <TooltipTrigger render={<span />}>{label}</TooltipTrigger>
                        <TooltipContent>{tooltip}</TooltipContent>
                      </Tooltip>
                    ) : (
                      label
                    )}
                    {isSorted &&
                      (sort.direction === "asc" ? (
                        <ArrowUp aria-hidden className="size-3.5" />
                      ) : (
                        <ArrowDown aria-hidden className="size-3.5" />
                      ))}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getAllCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(cell.column.id !== "model" && "text-right tabular-nums")}
              >
                <table.FlexRender cell={cell} />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
