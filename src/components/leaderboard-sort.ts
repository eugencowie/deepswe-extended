// Column sort primitives, pending a column module that owns cells, formatting
// and comparators together.

export type SortDirection = "asc" | "desc";

// Blank cells sort last regardless of direction, so the direction is an input
// rather than applied by negating the result afterwards.
export function compareBlankLast(
  a: number | null,
  b: number | null,
  direction: SortDirection,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return direction === "asc" ? a - b : b - a;
}
