# 01: System theme reactivity + dark-mode sweep

Type: task
Status: ready-for-agent

## What to build

With the theme set to `system`, changing the OS light/dark appearance updates the app live. Fix the vendored shadcn provider and sweep the adjacent gaps in the same files, per the [spec](../spec.md):

1. **Listener** (`src/components/ui/theme-provider.tsx`): while theme is `system`, subscribe to `matchMedia("(prefers-color-scheme: dark)")` changes and re-apply the `<html>` class on change; tear down on cleanup and when the theme leaves `system`. The stored preference is untouched — only the resolved appearance changes.
2. **`color-scheme` property** (`src/index.css`): `color-scheme: light` on `:root`, `color-scheme: dark` on `.dark`, so native scrollbars and form controls follow the theme.
3. **localStorage validation** (`theme-provider.tsx`): the read of `vite-ui-theme` accepts only `light`/`dark`/`system`; anything else falls back to the default instead of being cast and applied as a class.
4. **FOUC fix** (`index.html`): a blocking inline script reads the stored preference, resolves `system` against `prefers-color-scheme`, and sets the `<html>` class before first paint. It duplicates the storage key and resolution logic — a comment on both sides points at the other.
5. **Toggle state** (`src/components/ui/mode-toggle.tsx`): the dropdown indicates the currently selected theme (read `theme` from `useTheme`).

Update `src/components/ui/README.md`: `theme-provider` and `mode-toggle` have diverged from the shadcn originals and are maintained here.

## Acceptance criteria

- [ ] With theme `system`, flipping the OS appearance re-themes the app immediately, without reload or refocus; localStorage still holds `system`
- [ ] With theme `light` or `dark`, flipping the OS appearance changes nothing
- [ ] e2e: flip `colorScheme` mid-session and assert the `<html>` class updates; assert the toggle shows the active selection; assert `color-scheme` via `getComputedStyle`
- [ ] Junk in the `vite-ui-theme` localStorage key falls back to the default theme
- [ ] No light flash when loading with a dark resolved theme (manual verification — note the check in a comment below when done)
- [ ] README records the divergence from the vendored shadcn files
- [ ] `vp run ready` and the e2e task pass
