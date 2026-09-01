# Production Rollout Checklist

Do not run this checklist until the local acceptance build is approved. Each
section changes external state.

## 1. Source And Worker

1. Review and commit the current work in focused commits; preserve unrelated UI
   work separately.
2. Push the branch and confirm Python and web CI are green.
3. Deploy the Worker before publishing a manifest. The Worker supports both the
   legacy flat R2 layout and the versioned pointer.
4. Verify the existing production API still serves the legacy edition.

## 2. Collection Host

1. Back up `web/public/data`, `.raw`, and `.staging` outside the repository.
2. Run `python3 -m scripts.migrate_state --from web/public/data` and inspect
   `~/.local/share/frontier/preview`, `raw`, and `state/current.json`.
3. Run a local-only edition with `--process-only --no-publish`; use
   `--ignore-stale-collection` only for this migration check.
4. Run `python3 -m scripts.install_systemd`, inspect the rendered user units,
   then run `systemctl --user daemon-reload` and enable the four timers.
5. Confirm the next elapse times before disabling or removing legacy units.

## 3. First Versioned R2 Release

1. Run fresh medium, slow, and fast collections.
2. Run one normal `--process-only` publication and confirm upload hash checks.
3. Inspect R2 `current.json`, its three referenced release objects, and the
   60-day archive mapping.
4. Verify all four stable public API paths, including a historical archive.
5. Wait 48 hours before deleting old local directories or legacy flat current
   objects. Legacy archive objects remain until they age out of the manifest.

## 4. GitHub Repository Settings

After the reviewed branch is public, set the repository description, homepage,
and topics; enable Secret Scanning, Push Protection, Dependabot Alerts, and
security updates; and enable deletion of merged branches. Keep main branch
protection optional under the current lightweight contribution policy.

## 5. Legacy PyPI Package Retirement

After the README Skill URL is live and tested from a clean agent session, mark
the legacy PyPI package `frontiermemo` 0.0.1 as deprecated and Yank the release.
Do not delete the project name; leave a migration note pointing to the
repository Skill.

## Rollback

- Before `current.json` changes, no reader-visible rollback is necessary.
- To roll back a release, restore the previous valid `current.json`; immutable
  release objects remain available for at least 48 hours.
- To roll back the Worker, only do so while R2 still has compatible legacy flat
  objects.
- Keep the legacy local data backup until two scheduled publication cycles have
  succeeded.
