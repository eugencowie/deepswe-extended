# Spec: Dark mode fixes

The theme system (`theme-provider.tsx`, `mode-toggle.tsx`) is vendored from the [shadcn dark-mode docs](https://ui.shadcn.com/docs/dark-mode/vite) and carries that code's known gaps. The visible bug: with the theme set to `system`, the provider resolves `prefers-color-scheme` once and never subscribes, so changing the OS appearance while the app is open does nothing until a reload. This effort fixes that and sweeps the adjacent gaps found in the same files, in one change.

Decisions (grilling, 2026-08-23):

- **Signal**: `window.matchMedia("(prefers-color-scheme: dark)")` — cross-platform; macOS is where it gets verified, not a constraint. The app re-themes immediately when the OS switches, even while backgrounded.
- **Preference vs resolved appearance**: the stored setting (`light` | `dark` | `system` in localStorage) is never rewritten by an OS change; only the resolved appearance (the class on `<html>`) changes. Explicit `light`/`dark` ignore OS changes. This distinction lives in code names, not the glossary — theming is UI mechanics, not domain language.
- **Single application point**: the `<html>` class stays the only way the theme reaches the UI; anything theme-dependent derives from it.
- **Vendored posture**: the fix edits the vendored files; `src/components/ui/README.md` records the divergence instead of wrapping the files to keep them pristine.
- **Ride-alongs** (all small, all in scope): `color-scheme` CSS property so native scrollbars/form controls follow; validation of the localStorage read (junk falls back to the default); a blocking inline script in `index.html` to kill the light flash on dark-theme load (duplicates the storage key and resolution logic — kept in sync by comment); the mode toggle shows the active selection.
- **Tests**: the e2e flips `colorScheme` mid-session and asserts the `<html>` class updates, plus toggle-state and `color-scheme` assertions. The FOUC fix is verified manually.

One ticket: [01-system-theme-reactivity](tickets/01-system-theme-reactivity.md).
