# 01: System theme reactivity + dark-mode sweep

Type: task
Status: claimed

## What to build

With the theme set to `system`, changing the OS light/dark appearance updates the app live. Fix the vendored shadcn provider and sweep the adjacent gaps in the same files, per the [spec](../spec.md):

1. **Listener** (`src/components/ui/theme-provider.tsx`): while theme is `system`, subscribe to `matchMedia("(prefers-color-scheme: dark)")` changes and re-apply the `<html>` class on change; tear down on cleanup and when the theme leaves `system`. The stored preference is untouched — only the resolved appearance changes.
2. **`color-scheme` property** (`src/index.css`): `color-scheme: light` on `:root`, `color-scheme: dark` on `.dark`, so native scrollbars and form controls follow the theme.
3. **localStorage validation** (`theme-provider.tsx`): the read of `vite-ui-theme` accepts only `light`/`dark`/`system`; anything else falls back to the default instead of being cast and applied as a class.
4. **FOUC fix** (`index.html`): a blocking inline script reads the stored preference, resolves `system` against `prefers-color-scheme`, and sets the `<html>` class before first paint. It duplicates the storage key and resolution logic — a comment on both sides points at the other.
5. **Toggle state** (`src/components/ui/mode-toggle.tsx`): the dropdown indicates the currently selected theme (read `theme` from `useTheme`).

Update `src/components/ui/README.md`: `theme-provider` and `mode-toggle` have diverged from the shadcn originals and are maintained here.

## Acceptance criteria

- [x] With theme `system`, flipping the OS appearance re-themes the app immediately, without reload or refocus; localStorage still holds `system`
- [x] With theme `light` or `dark`, flipping the OS appearance changes nothing
- [x] e2e: flip `colorScheme` mid-session and assert the `<html>` class updates; assert the toggle shows the active selection; assert `color-scheme` via `getComputedStyle`
- [x] Junk in the `vite-ui-theme` localStorage key falls back to the default theme
- [ ] No light flash when loading with a dark resolved theme (manual verification — note the check in a comment below when done)
- [x] README records the divergence from the vendored shadcn files
- [x] `vp run ready` and the e2e task pass

## Comments

**2026-08-23** — Implemented in `e2e/theme.test.ts` (five tests: live system reactivity, `color-scheme`, toggle state, explicit theme ignoring OS flips, localStorage fallback) plus edits to `theme-provider.tsx`, `mode-toggle.tsx` (radio group), `index.css`, and `index.html`. Ride-along: `e2e/` moved from `tsconfig.node.json` into a new `tsconfig.e2e.json` (extends it, adds the DOM lib) because the `page.evaluate` callbacks use browser globals. Status is `ready-for-human`: code review is addressed and all automated criteria pass; only the manual FOUC verification on macOS remains.
