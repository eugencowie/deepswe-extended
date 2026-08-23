import { useMemo, useState, type ReactNode } from "react";
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

type ColumnId = "model" | "passAt1" | "avgCost" | "costPerf" | "outTok" | "steps";

// Everything a column needs lives in one spec: adding a column (tickets 07/08)
// means adding one entry here, nothing else.
type ColumnSpec = {
  id: ColumnId;
  header: string;
  tooltip?: string;
  align: "left" | "right";
  firstDirection: SortDirection;
  cell: (row: LeaderboardRow) => ReactNode;
  compare: (a: LeaderboardRow, b: LeaderboardRow, direction: SortDirection) => number;
};

function numericColumn(spec: {
  id: ColumnId;
  header: string;
  tooltip?: string;
  value: (row: LeaderboardRow) => number | null;
  cell: (row: LeaderboardRow) => ReactNode;
}): ColumnSpec {
  return {
    ...spec,
    align: "right",
    firstDirection: "desc",
    compare: (a, b, direction) => compareBlankLast(spec.value(a), spec.value(b), direction),
  };
}

const columnSpecs: ColumnSpec[] = [
  {
    id: "model",
    header: "Model",
    align: "left",
    firstDirection: "asc",
    compare: (a, b, direction) => (direction === "asc" ? compareModel(a, b) : compareModel(b, a)),
    cell: (row) => (
      <>
        {row.displayName}
        {row.effort !== null && <span className="text-muted-foreground"> [{row.effort}]</span>}
      </>
    ),
  },
  numericColumn({
    id: "passAt1",
    header: "Pass@1",
    value: (row) => row.passAt1,
    cell: (row) => formatPassAt1(row.passAt1),
  }),
  numericColumn({
    id: "avgCost",
    header: "Avg cost",
    value: (row) => row.effectiveCostUsd,
    cell: (row) => formatUsd(row.effectiveCostUsd),
  }),
  numericColumn({
    id: "costPerf",
    header: "Cost/perf",
    tooltip: "Avg cost ÷ Pass@1: what you pay per task actually solved",
    value: (row) => row.costPerSolvedTaskUsd,
    cell: (row) => formatUsd(row.costPerSolvedTaskUsd),
  }),
  numericColumn({
    id: "outTok",
    header: "Out tok",
    value: (row) => row.outputTokens,
    cell: (row) => formatTokens(row.outputTokens),
  }),
  numericColumn({
    id: "steps",
    header: "Steps",
    value: (row) => row.steps,
    cell: (row) => formatInteger(row.steps),
  }),
];

const features = tableFeatures({});
const helper = createColumnHelper<typeof features, LeaderboardRow>();

const columns = helper.columns(
  columnSpecs.map((spec) =>
    helper.display({
      id: spec.id,
      header: spec.header,
      cell: ({ row }) => spec.cell(row.original),
    }),
  ),
);

export function LeaderboardTable({ rows }: { rows: LeaderboardRow[] }) {
  const [sort, setSort] = useState<{ columnId: ColumnId; direction: SortDirection }>({
    columnId: "passAt1",
    direction: "desc",
  });

  // Sorting lives outside TanStack: its sorted row model reverses comparator
  // results for descending order, which would put blank cells first. The spec
  // comparators receive the direction instead, so blanks sort last both ways.
  const sortedRows = useMemo(() => {
    const spec = columnSpecs.find((s) => s.id === sort.columnId) ?? columnSpecs[0];
    return rows.toSorted((a, b) => spec.compare(a, b, sort.direction));
  }, [rows, sort]);

  const table = useTable({ features, columns, data: sortedRows });

  // Two-state toggle: a sorted column flips direction, a fresh column starts
  // in its natural direction. There is no unsorted state.
  const toggleSort = (spec: ColumnSpec) => {
    setSort((current) =>
      current.columnId === spec.id
        ? { columnId: spec.id, direction: current.direction === "asc" ? "desc" : "asc" }
        : { columnId: spec.id, direction: spec.firstDirection },
    );
  };

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((group) => (
          <TableRow key={group.id}>
            {/* Column order never changes, so headers zip with specs by index. */}
            {group.headers.map((header, index) => {
              const spec = columnSpecs[index];
              const isSorted = sort.columnId === spec.id;
              const label = (
                <span
                  className={cn(spec.tooltip && "underline decoration-dotted underline-offset-4")}
                >
                  <table.FlexRender header={header} />
                </span>
              );
              return (
                <TableHead
                  key={header.id}
                  aria-sort={
                    isSorted ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(spec.align === "right" && "text-right")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(spec)}
                    className="inline-flex cursor-pointer items-center gap-1 font-medium"
                  >
                    {spec.tooltip ? (
                      <Tooltip>
                        <TooltipTrigger render={<span />}>{label}</TooltipTrigger>
                        <TooltipContent>{spec.tooltip}</TooltipContent>
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
            {row.getAllCells().map((cell, index) => (
              <TableCell
                key={cell.id}
                className={cn(columnSpecs[index].align === "right" && "text-right tabular-nums")}
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
