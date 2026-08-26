import { useMemo, useState } from "react";

import { LeaderboardTable } from "@/components/leaderboard-table";
import {
  LeaderboardToolbar,
  type ModelOption,
  type UsageLimitNote,
} from "@/components/leaderboard-toolbar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { deriveRows } from "@/data/derive";
import { defaultFilters, filterRows } from "@/data/filter";
import {
  deepsweSnapshot,
  modelMapping,
  throughputSnapshot,
  tiers,
  tiersSnapshot,
} from "@/data/sources";

const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);

const modelOptions: ModelOption[] = [...new Map(rows.map((row) => [row.model, row.displayName]))]
  .map(([model, displayName]) => ({ model, displayName }))
  .toSorted((a, b) => a.displayName.localeCompare(b.displayName, "en"));

// Family models with non-standard usage limits get their own discount badge
// per tier in the Subscriptions picker.
const usageLimitNotes: UsageLimitNote[] = modelMapping.flatMap((entry) =>
  entry.family === "none" || entry.usageMultiplier === 1
    ? []
    : [
        {
          family: entry.family,
          name: entry.shortName ?? entry.displayName,
          usageMultiplier: entry.usageMultiplier,
        },
      ],
);

// The UTC date of a snapshot timestamp, robust to non-UTC offsets in a
// future refresh (a plain slice would take the offset-local date).
const utcDate = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);

const snapshotDate = utcDate(deepsweSnapshot.source_generated_at);
const throughputDate = utcDate(throughputSnapshot.capturedAt);

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <p>
      <a
        href={href}
        className="underline decoration-dotted underline-offset-4 hover:text-foreground"
      >
        {children}
      </a>
    </p>
  );
}

function App() {
  const [filters, setFilters] = useState(() =>
    defaultFilters(modelOptions.map(({ model }) => model)),
  );
  const visibleRows = useMemo(() => filterRows(rows, filters), [filters]);

  return (
    // max-w-5xl: wide enough for tier rows' struck-out API costs.
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">DeepSWE Leaderboard, Extended</h1>
        <ModeToggle />
      </header>
      <main className="flex flex-col gap-4">
        <LeaderboardToolbar
          filters={filters}
          onChange={setFilters}
          models={modelOptions}
          tiers={tiers}
          usageLimitNotes={usageLimitNotes}
        />
        <LeaderboardTable
          rows={visibleRows}
          empty="No models selected. Use the Models menu to pick one or more."
        />
      </main>
      <footer className="text-xs text-muted-foreground">
        <FooterLink href={deepsweSnapshot.sourceUrl}>
          DeepSWE v1.1 snapshot, {snapshotDate}
        </FooterLink>
        <FooterLink href={throughputSnapshot.sourceUrl}>
          OpenRouter throughput snapshot, {throughputDate}
        </FooterLink>
        <FooterLink href={tiersSnapshot.sourceUrl}>
          Subsidised costs are rough approximations based on SemiAnalysis estimates.
        </FooterLink>
      </footer>
    </div>
  );
}

export default App;
