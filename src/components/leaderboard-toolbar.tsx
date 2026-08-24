import { ChevronDown } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/components/ui/utils";
import type { LeaderboardFilters } from "@/data/filter";
import type { AccessRoute, Tier } from "@/data/types";

export type ModelOption = { model: string; displayName: string };

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
}: {
  filters: LeaderboardFilters;
  onChange: (filters: LeaderboardFilters) => void;
  models: ModelOption[];
  tiers: Tier[];
}) {
  const toggleRoute = (family: "claude" | "chatgpt", route: AccessRoute) => {
    const routes = new Set(filters.subscriptions[family]);
    if (routes.has(route)) {
      routes.delete(route);
    } else {
      routes.add(route);
    }
    onChange({ ...filters, subscriptions: { ...filters.subscriptions, [family]: routes } });
  };

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

  const subscriptionCount = filters.subscriptions.claude.size + filters.subscriptions.chatgpt.size;
  const subscriptionTotal = families.length + tiers.length;

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
            Subscriptions ({subscriptionCount}/{subscriptionTotal})
            <ChevronDown data-icon="inline-end" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {families.map(({ family, label }, index) => {
              const selection = filters.subscriptions[family];
              const routes: { route: AccessRoute; routeLabel: string }[] = [
                { route: "api", routeLabel: "API" },
                ...tiers
                  .filter((tier) => tier.family === family)
                  .map((tier) => ({ route: tier.id, routeLabel: tier.shortLabel })),
              ];
              return (
                <DropdownMenuGroup key={family}>
                  {index > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel>{label}</DropdownMenuLabel>
                  {routes.map(({ route, routeLabel }) => (
                    <DropdownMenuCheckboxItem
                      key={route}
                      checked={selection.has(route)}
                      // The last ticked route in a section cannot be unticked,
                      // so the picker alone never hides a whole family.
                      disabled={selection.has(route) && selection.size === 1}
                      closeOnClick={false}
                      onCheckedChange={() => toggleRoute(family, route)}
                    >
                      {routeLabel}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
              );
            })}
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
