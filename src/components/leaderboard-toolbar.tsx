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
import { ButtonGroup } from "@/components/ui/button-group";
import { cn } from "@/components/ui/utils";
import { formatTierDiscount } from "@/data/format";
import {
  setEffortView,
  setModels,
  setRoute,
  toggleModel,
  type LeaderboardFilters,
  type ModelOption,
  type PickerFamily,
} from "@/data/leaderboard";
import type { AccessRoute } from "@/data/types";

const effortViews = [
  { view: "best", label: "Best" },
  { view: "all", label: "All effort levels" },
] as const;

const familyLabels = { claude: "Claude", chatgpt: "ChatGPT" } as const;

export function LeaderboardToolbar({
  filters,
  onChange,
  models,
  pickerFamilies,
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  models: ModelOption[];
  pickerFamilies: PickerFamily[];
}) {
  // The trigger surfaces only non-API picks: quiet on the default view, the
  // chosen tiers at a glance otherwise (section order, Claude first).
  const tierPicks = pickerFamilies.flatMap(({ family, tiers }) => {
    const tier = tiers.find((t) => t.id === filters.subscriptions[family]);
    return tier ? [tier.shortLabel] : [];
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The benchmark version is fixed; a static chip, not a dead toggle. */}
      <span className={cn(buttonVariants({ size: "sm" }), "pointer-events-none")}>v1.1</span>
      <ButtonGroup aria-label="Effort levels">
        {effortViews.map(({ view, label }) => (
          <Button
            key={view}
            size="sm"
            variant={filters.effortView === view ? "default" : "outline"}
            aria-pressed={filters.effortView === view}
            onClick={() => onChange(setEffortView(filters, view))}
          >
            {label}
          </Button>
        ))}
      </ButtonGroup>
      <div className="ms-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            Subscriptions{tierPicks.length > 0 && `: ${tierPicks.join(" · ")}`}
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {pickerFamilies.map(({ family, tiers }, index) => (
              <DropdownMenuGroup key={family}>
                {index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel>{familyLabels[family]}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.subscriptions[family]}
                  onValueChange={(route) =>
                    onChange(setRoute(filters, family, route as AccessRoute))
                  }
                >
                  <DropdownMenuRadioItem value="api" closeOnClick={false}>
                    API
                  </DropdownMenuRadioItem>
                  {tiers.map((tier) => (
                    <DropdownMenuRadioItem key={tier.id} value={tier.id} closeOnClick={false}>
                      {tier.shortLabel}
                      <span className="ms-auto flex gap-1">
                        <Badge variant="outline" className="text-muted-foreground">
                          {formatTierDiscount(tier.tierDiscount)}
                        </Badge>
                        {tier.notes.map((note) => (
                          <Badge
                            key={note.name}
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            {note.name}: {formatTierDiscount(note.tierDiscount)}
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
                  onCheckedChange={() => onChange(toggleModel(filters, model))}
                >
                  {displayName}
                </DropdownMenuCheckboxItem>
              ))}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() =>
                onChange(setModels(filters, new Set(models.map(({ model }) => model))))
              }
            >
              Select all
            </DropdownMenuItem>
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => onChange(setModels(filters, new Set()))}
            >
              Clear
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
