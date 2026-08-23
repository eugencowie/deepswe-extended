import { LeaderboardTable } from "@/components/leaderboard-table";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { deriveRows } from "@/data/derive";
import { deepsweSnapshot, modelMapping } from "@/data/sources";

const rows = deriveRows(deepsweSnapshot, modelMapping);

// The snapshot timestamp is UTC; the first ten characters are its date.
const snapshotDate = deepsweSnapshot.source_generated_at.slice(0, 10);

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
      </footer>
    </div>
  );
}

export default App;
