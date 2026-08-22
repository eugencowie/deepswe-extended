# Vite+ package manager pin research

Researched on 2026-08-22 against Vite+ v0.2.9, commit
[`73bdd105`](https://github.com/voidzero-dev/vite-plus/tree/73bdd105c2b7c263b55f7e9b48a37a8933cc317a).

## Answer

Vite+ v0.2.9 has no command that updates an existing
`devEngines.packageManager.version` to the latest pnpm release. The current
command is still needed if the project wants an exact package manager pin:

```sh
vp env exec npm --force pkg set \
  "devEngines.packageManager.version=$(vp info pnpm version)"
```

`vp env pin` is only for Node.js. Its two write targets are `.node-version` and
`package.json#devEngines.runtime`; there is no package manager target.
[Vite+ v0.2.9 CLI definition](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_global_cli/src/cli.rs#L338-L370)

The Vite+ package management command set also has no `pin`, `use`, or
self-update command for the selected package manager. `vp info` and `vp update`
are registry and project-dependency commands.
[Vite+ v0.2.9 package management commands](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_pm_cli/src/cli.rs#L27-L70)

## What the existing command uses

`vp info pnpm version` resolves to `pnpm view pnpm version` in a pnpm project.
The pnpm command reads the `version` field from the registry metadata for the
default package release.
[Vite+ view command resolver](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_pm_cli/src/resolution/commands/view.rs#L26-L35)
[pnpm `view` reference](https://pnpm.io/cli/view)

The command substitution passes that version to `npm pkg set`. Vite+ supplies
npm from the project's resolved Node.js environment through `vp env exec`.
This is a composition of Vite+ commands and npm's manifest editor, not a hidden
Vite+ pin operation.
[Vite+ environment command definition](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_global_cli/src/cli.rs#L410-L431)

## Why the nearby Vite+ commands do not replace it

`vp install` auto-pins a package manager only when Vite+ detects it from a
lockfile, configuration file, or fallback default. Once either `packageManager`
or `devEngines.packageManager` exists, Vite+ treats that declaration as the
source of truth and leaves it unchanged.
[Vite+ install guide](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/docs/guide/install.md#L9-L24)
[Auto-pin implementation](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_pm_cli/src/package_manager.rs#L196-L224)

`vp migrate` follows the same rule. It writes an exact package manager version
when neither field exists, but preserves an existing declaration.
[Vite+ migration implementation](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/packages/cli/src/migration/migrator/setup.ts#L14-L45)

`vp update --latest` updates dependency entries. For pnpm, Vite+ translates it
to `pnpm update --latest`; it does not edit `devEngines`.
[Vite+ update resolver](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_pm_cli/src/resolution/commands/update.rs#L75-L92)

A semver range such as `^11.0.0` can remove the need for an exact-pin update,
but it changes the policy. Vite+ prefers an already downloaded version that
satisfies the range and only queries the registry when none is cached. It does
not guarantee that an upgrade task selects the latest pnpm release.
[Vite+ install guide](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/docs/guide/install.md#L24-L40)
[Range resolver](https://github.com/voidzero-dev/vite-plus/blob/v0.2.9/crates/vp_pm_cli/src/package_manager.rs#L811-L840)

## Proposed built-in command

[Vite+ pull request #2398](https://github.com/voidzero-dev/vite-plus/pull/2398)
proposes extending `vp env pin` to package managers. Its draft documentation
shows qualified package manager specifications such as
`vp env pin pnpm@10.18.0`, and the implementation accepts `latest`, resolves it
to an exact registry version, then updates the existing package manager field.
If merged in its current form, the replacement for this repo's npm command
would be:

```sh
vp env pin pnpm@latest
```

[Draft command documentation](https://github.com/voidzero-dev/vite-plus/blob/2a6acd07810acbf303f0c57ad30b2245bbf8c3ba/docs/guide/env.md#L11-L17)
[Draft `latest` resolver](https://github.com/voidzero-dev/vite-plus/blob/2a6acd07810acbf303f0c57ad30b2245bbf8c3ba/crates/vp_pm_cli/src/package_manager.rs#L925-L936)
[Draft manifest update](https://github.com/voidzero-dev/vite-plus/blob/2a6acd07810acbf303f0c57ad30b2245bbf8c3ba/crates/vp_global_cli/src/commands/env/pin.rs#L680-L730)

The pull request was still a draft and unmerged on 2026-08-22. Its syntax and
behavior may change before release, so v0.2.9 cannot use this command.
[Pull request status](https://github.com/voidzero-dev/vite-plus/pull/2398)

## Recommendation

Keep the existing command while this project uses an exact pnpm pin. If Vite+
ships the package manager support from pull request #2398, replace the npm edit
with `vp env pin pnpm@latest` after checking the released help. Do not rely on
`vp install`, `vp migrate`, or `vp update --latest` to update an existing exact
pin in v0.2.9.
