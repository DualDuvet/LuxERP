# Local artifacts and temporary files

This file marks project files that are useful during local development but should not be treated as product source.

## Ignored by git

- `.env` and `.env.local` hold local secrets and machine-specific settings.
- `.data/` stores file-mode orders, dictionaries, users and import previews.
- `.next/` stores Next.js build and dev-server output.
- `node_modules/` stores installed npm packages.
- `*.log` files are local process output, including `dev-server*.log`, `next-dev*.log`, `next-start*.log` and `ssh-tunnel*.log`.
- `.tmp-*` files are temporary local helper artifacts and ad hoc reports.
- `backups/` stores local backup snapshots created on the workstation.
- `tsconfig.tsbuildinfo` is TypeScript incremental build metadata.
- `playwright-report/` and `test-results/` are local test reports.

## Tracked fixtures and references

- `docs/124,05.xlsx` is a test fixture for spreadsheet import coverage.
- `screenshots/*.png` are visual reference snapshots from manual checks.
- `public/print-logo.png` is a runtime asset used by printable specifications.

## Cleanup note

The ignored files above can be deleted when the local environment needs a clean restart. Tracked fixtures should stay in place unless the tests and documentation are updated together.
