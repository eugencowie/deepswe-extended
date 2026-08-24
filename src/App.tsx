import { LeaderboardTable } from "@/components/leaderboard-table";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { deriveRows } from "@/data/derive";
import { deepsweSnapshot, modelMapping, throughputSnapshot, tiers } from "@/data/sources";

const rows = deriveRows(deepsweSnapshot, modelMapping, throughputSnapshot, tiers);

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
        <FooterLink href="https://deepswe.datacurve.ai">
          DeepSWE v1.1 snapshot, {snapshotDate}
        </FooterLink>
        <FooterLink href="https://openrouter.ai">
          OpenRouter throughput snapshot, {throughputDate}
        </FooterLink>
        <FooterLink href="https://x.com/SemiAnalysis_/status/2064815044085318040">
          Subsidised costs are rough approximations based on SemiAnalysis estimates.
        </FooterLink>
      </footer>
    </div>
  );
}

export default App;
