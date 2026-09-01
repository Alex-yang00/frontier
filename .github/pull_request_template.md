## What changed

Describe the user-visible or operational change.

## Verification

- [ ] `python3 -m pytest -q`
- [ ] `python3 -m compileall core collectors scripts`
- [ ] `cd web && pnpm lint && pnpm build` for web changes

## Data and security

- [ ] No credentials, local snapshots, or private source data are included.
- [ ] Schema or publication changes include migration and rollback notes.
