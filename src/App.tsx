import { LeaderboardTable } from "@/components/leaderboard-table";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { deriveRows } from "@/data/derive";
import { deepsweSnapshot, modelMapping, throughputSnapshot } from "@/data/sources";

const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot);

// The UTC date of a snapshot timestamp, robust to non-UTC offsets in a
// future refresh (a plain slice would take the offset-local date).
const utcDate = (timestamp: string) => new Date(timestamp).toISOString().slice(0, 10);

const snapshotDate = utcDate(deepsweSnapshot.source_generated_at);
const throughputDate = utcDate(throughputSnapshot.capturedAt);

function App() {
  return (
    <div className="mx-auto flex min-h-svh max-w-4xl flex-col gap-4 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">DeepSWE v1.1 leaderboard</h1>
        <ModeToggle />
      </header>
      <main>
        <LeaderboardTable rows={rows} />
      </main>
      <footer className="text-xs text-muted-foreground">
        <p>
          <a
            href="https://deepswe.datacurve.ai"
            className="underline decoration-dotted underline-offset-4 hover:text-foreground"
          >
            DeepSWE v1.1 snapshot, {snapshotDate}
          </a>
        </p>
        <p>
          <a
            href="https://openrouter.ai"
            className="underline decoration-dotted underline-offset-4 hover:text-foreground"
          >
            OpenRouter throughput snapshot, {throughputDate}
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
