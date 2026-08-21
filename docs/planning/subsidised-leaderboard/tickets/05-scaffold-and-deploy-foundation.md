# 05: Scaffold the Vite+ workspace and deploy the template site

Type: task
Status: claimed
Blocked by: none

## What to build

A working, deployed foundation before any feature work: the Vite+ template running locally and published to GitHub Pages, so every later ticket lands on proven CI and hosting.

Per the [spec](../spec.md) (Toolchain, Repo and deploy): Vite+ template, pnpm, mise with the vite-plus plugin; public GitHub repo `deepswe-analysis` (no remote exists yet); Actions workflow gated by `vp run ready` that builds and publishes to Pages with the project base path.

User-owned: repo creation and GitHub Actions setup are handled by the user.

## Acceptance criteria

- [x] Template app runs locally under pnpm + mise; `vp run ready` passes
- [x] Public GitHub repo exists with this repo's history pushed
- [x] Push to main runs `vp run ready`, builds, and deploys to GitHub Pages
- [ ] The template site loads at the project Pages URL (correct `base` path)
