# LuxERP specification site

File-first application for managing production order specifications.

## Stack

- Next.js App Router, React and TypeScript
- Tailwind CSS
- JSON file storage for orders by default, with an optional PostgreSQL migration path
- Prisma ORM and PostgreSQL schema for the optional order database mode
- Better Auth with a separate SQLite database for users and sessions
- Vitest for calculation tests
- `exceljs` for XLSX export templates
- Playwright reserved for PDF generation and end-to-end checks
- Docker Compose with PostgreSQL and optional Redis

## Start locally

```powershell
copy .env.example .env
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:auth:deploy
npm.cmd run dev
```

Open `http://localhost:3000/orders`.

Set `AUTH_DATABASE_URL`, `AUTH_SECRET`, `AUTH_BOOTSTRAP_USERNAME`, `AUTH_BOOTSTRAP_PHRASE` and `BETTER_AUTH_URL` in `.env` before starting the app.
Better Auth stores its data in SQLite using `AUTH_DATABASE_URL`; it does not require PostgreSQL. The default `ORDER_STORE="file"` keeps order data in JSON files.

## Required auth configuration

The app refuses to start unless these values are explicitly set:

- `AUTH_SECRET` must be at least 32 characters long and must not use a placeholder value.
- `AUTH_BOOTSTRAP_USERNAME` must be a valid local login.
- `AUTH_BOOTSTRAP_PHRASE` must contain exactly three words.

This check runs during app startup and production build, so unsafe auth defaults cannot slip into deployment.

Generate a fresh secret with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

## Useful commands

```powershell
npm.cmd run test
npm.cmd run test:routes
npm.cmd run build
npm.cmd run start:tunnel
npm.cmd run prisma:auth:deploy
npm.cmd run prisma:migrate
npm.cmd run prisma:deploy
npm.cmd run prisma:push
npm.cmd run orders:sync
docker compose up --build
```

## Tests

- `npm.cmd run test` runs all Vitest checks: calculations, exports, customer summaries, storage configuration and the API route contract.
- `npm.cmd run test:routes` verifies that `docs/architecture.md` lists the same API methods and paths that exist under `app/api/**/route.ts`.

## Public hosting through VDS

For publishing the local app through a VDS with `WireGuard` and `Caddy`, see [docs/vds-wireguard-caddy.md](docs/vds-wireguard-caddy.md).

For a short practical deployment note covering local production launch, second-PC access, public domain access and current PWA state, see [docs/deployment-short.md](docs/deployment-short.md).

## Storage modes and databases

Better Auth always uses the SQLite database configured by `AUTH_DATABASE_URL`. Run `npm.cmd run prisma:auth:deploy` once after installing dependencies; with the local example configuration the database file is `prisma/auth/auth.db`.

The application uses JSON files for orders unless `ORDER_STORE="prisma"` is set explicitly. Merely setting `DATABASE_URL` does not switch storage. Prisma order mode fails when PostgreSQL is unavailable; it never silently writes to a second storage backend.

Current production configuration:

```env
ORDER_STORE="file"
AUTH_DATABASE_URL="file:./auth.db"
```

Planned migration sequence:

```powershell
docker compose up postgres -d
npm.cmd run prisma:deploy
npm.cmd run orders:sync
# Verify the migrated data, then change ORDER_STORE to "prisma" and restart.
```

The sync command copies orders without deleting the source files. Authentication data is managed separately in SQLite.

## Data and local artifacts

- `.env`, `.env.local`, `.data`, logs, build output and test reports are ignored by git.
- `.env.example` is intentionally tracked as the setup template.
- In file mode, orders are stored under `.data/orders` and dictionaries under `.data/dictionaries.json`.
- Better Auth users, credential hashes, sessions and rate-limit records are stored in `prisma/auth/auth.db` locally. Docker stores the same database in its persistent `.data` volume.
- Current local temporary files are marked in [docs/local-artifacts.md](docs/local-artifacts.md).
- Before publishing the app, set a strong `AUTH_SECRET` and a unique three-word `AUTH_BOOTSTRAP_PHRASE`.

## Encoding note

Russian text in source files may look corrupted when read through some PowerShell commands or terminal output, even if the file itself is valid UTF-8. In particular, strings like `РЎРїРµ...` can be a console rendering artifact rather than real mojibake in the code.

If you suspect broken encoding:

- trust the IDE or raw UTF-8 file content over a single terminal rendering;
- verify the file with a UTF-8-aware reader such as Node.js `fs.readFileSync(path, "utf8")`;
- do not rewrite strings only because PowerShell displayed them incorrectly.

## Current state

The app includes calculation utilities, order list/card/edit/create screens, Better Auth username authentication, role-gated user and dictionary management, editable specification lines, payment management, printable HTML and Prisma persistence.

Write endpoints are active for orders, order lines, payments, dictionaries and users. Better Auth is independent from `ORDER_STORE` and uses SQLite.
