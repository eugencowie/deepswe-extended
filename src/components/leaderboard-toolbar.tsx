import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import { subsidisationFactor } from "@/data/derive";
import { formatTierDiscount } from "@/data/format";
import type { LeaderboardFilters } from "@/data/filter";
import type { AccessRoute, Tier } from "@/data/types";

export type ModelOption = { model: string; displayName: string };

// A family model with a non-standard usage limit, badged per tier in the
// Subscriptions picker because its discount differs from the tier-wide one.
export type UsageLimitNote = {
  family: "claude" | "chatgpt";
  name: string;
  usageMultiplier: number;
};

const effortViews = [
  { view: "best", label: "Best" },
  { view: "all", label: "All effort levels" },
] as const;

const families = [
  { family: "claude", label: "Claude" },
  { family: "chatgpt", label: "ChatGPT" },
] as const;

export function LeaderboardToolbar({
  filters,
  onChange,
  models,
  tiers,
  usageLimitNotes,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  models: ModelOption[];
  tiers: Tier[];
  usageLimitNotes: UsageLimitNote[];
}) {
  const setRoute = (family: "claude" | "chatgpt", route: AccessRoute) =>
    onChange({ ...filters, subscriptions: { ...filters.subscriptions, [family]: route } });

  const setModels = (selected: ReadonlySet<string>) => onChange({ ...filters, models: selected });

  const toggleModel = (model: string) => {
    const selected = new Set(filters.models);
    if (selected.has(model)) {
      selected.delete(model);
    } else {
      selected.add(model);
    }
    setModels(selected);
  };

  // The trigger surfaces only non-API picks: quiet on the default view, the
  // chosen tiers at a glance otherwise (section order, Claude first).
  const tierPicks = families.flatMap(({ family }) => {
    const tier = tiers.find((t) => t.id === filters.subscriptions[family]);
    return tier ? [tier.shortLabel] : [];
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The benchmark version is fixed; a static chip, not a dead toggle. */}
      <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>v1.1</span>
      <div role="group" aria-label="Effort levels" className="flex items-center gap-1">
        {effortViews.map(({ view, label }) => (
          <Button
            key={view}
            size="sm"
            variant={filters.effortView === view ? "default" : "ghost"}
            aria-pressed={filters.effortView === view}
            onClick={() => onChange({ ...filters, effortView: view })}
          >
            {label}
          </Button>
        ))}
      </div>
      <div className="ms-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Subscriptions{tierPicks.length > 0 && `: ${tierPicks.join(" · ")}`}
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {families.map(({ family, label }, index) => (
              <DropdownMenuGroup key={family}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{label}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.subscriptions[family]}
                  onValueChange={(route) => setRoute(family, route as AccessRoute)}
                >
                  <DropdownMenuRadioItem value="api" closeOnClick={false}>
                    API
                  </DropdownMenuRadioItem>
                  {tiers
                    .filter((tier) => tier.family === family)
                    .map((tier) => (
                      <DropdownMenuRadioItem key={tier.id} value={tier.id} closeOnClick={false}>
                        {tier.shortLabel}
                        <span className="ms-auto flex gap-1">
                          <Badge variant="outline" className="text-muted-foreground">
                            {formatTierDiscount(subsidisationFactor(tier, 1))}
                          </Badge>
                          {usageLimitNotes
                            .filter((note) => note.family === family)
                            .map((note) => (
                              <Badge
                                key={note.name}
                                variant="outline"
                                className="text-muted-foreground"
                              >
                                {note.name}:{" "}
                                {formatTierDiscount(
                                  subsidisationFactor(tier, note.usageMultiplier),
                                )}
                              </Badge>
                            ))}
                        </span>
                      </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            ))}
            <DropdownMenuSeparator />
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Subscription costs are estimates: the struck-out API cost scaled by the tier's
              discount.
            </p>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Models ({filters.models.size}/{models.length})
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <div className="max-h-72 overflow-y-auto">
              {models.map(({ model, displayName }) => (
                <DropdownMenuCheckboxItem
                  key={model}
                  checked={filters.models.has(model)}
                  closeOnClick={false}
                  onCheckedChange={() => toggleModel(model)}
                >
                  {displayName}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => setModels(new Set(models.map(({ model }) => model)))}
            >
              Select all
            </DropdownMenuItem>
            <DropdownMenuItem closeOnClick={false} onClick={() => setModels(new Set())}>
              Clear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
