# 0001: Toolchain conventions for the scaffold

Status: accepted
Date: 2026-08-21

## Context

Code review of the `template-site` branch (ticket 05) flagged several scaffold choices as code smells or spec deviations. Each was walked through with the user and kept on purpose. This ADR records them so later reviews don't reopen settled ground.

## Decisions

**Tailnet scripts stay duplicated, until there are three.** `dev:tailnet` and `preview:tailnet` in `package.json` repeat the same `concurrently` + `tailscale serve` incantation with different ports. Development happens over the tailnet, so the scripts are necessary, and two near-identical scripts are cheaper to read than one parameterised one. The trigger to extract a shared script is a third `:tailnet` variant appearing.

**Vite config merges layered objects via `defineMergedConfig`.** The array-merge helper in `vite.config.ts` keeps template-generated defaults (`baseConfig`, `vitePlusConfig`) separate from project overrides (`projectConfig`). Three static objects don't need it yet; it earns its keep when `reactConfig` and the Tailwind config join in ticket 06.

**Routine mise tasks delegate one-for-one to `vp`.** Each routine task is a thin wrapper, which doubles the edit surface when a command changes. That cost is accepted because `mise tasks` is the discovery mechanism: a contributor with only mise installed can list everything the project can do. The `upgrade` task is the exception. It combines mise maintenance with a hidden nested task for the Vite+ upgrade. mise resolves a task's tools when that task starts, so the nested task forces mise to load the newly upgraded Vite+ before running `vp`. Only the user-facing `upgrade` task is listed; its nested task is hidden because it is an implementation detail.

**The Pages base path is derived at deploy time, not hardcoded.** The deploy job reads the base from `actions/configure-pages` and passes it to `vp build --base`. The repo can move or deploy anywhere without a config edit; the trade-off is that no build before deploy uses the real Pages base (`vp run e2e` builds at `/e2e/`; `vp run ready` and a plain `vp build` use `/`). A root-absolute URL that 404s under `/deepswe-analysis/` therefore passes every gate except the Playwright smoke below.

**One workflow file, `ci.yml`.** The spec originally named `deploy.yml`, but the workflow also runs the `vp run ready` gate on pull requests, so the broader name fits. The deploy job rebuilds with the Pages base; the ready job gates it via `needs`.

**A Playwright smoke test guards the base path (ticket 06).** One test: build at a sentinel base, serve with `vp preview`, assert the table renders with no failed requests. This replaces manual "the deployed site loads" verification and catches the root-absolute URL class, which already bit once (the icons fix in ticket 05).

**UI components come from shadcn/ui on Base UI primitives, with Tailwind.** Chosen for familiarity and usable defaults; the one genuinely fiddly component (the per-model multi-select dropdown) gets its behaviour from Base UI rather than being hand-written. Charts were explicitly not a factor in this decision, though a chart view is a plausible post-MVP feature (the DeepSWE site offers one) and shadcn would accommodate it. Implementers should pair shadcn's table markup with their own TanStack Table wiring rather than stacking two table abstractions.
