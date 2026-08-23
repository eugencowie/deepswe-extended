# shadcn/ui

This folder contains vendored code from `shadcn/ui`.

## Regenerating

Regenerate the currently installed components with:

```bash
vp exec shadcn add --overwrite \
  button dropdown-menu table tooltip
vp check --fix
```

Review the resulting diff and stage only the upstream changes that should be adopted. Keep the component list above synchronised with the installed files.
