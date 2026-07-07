# LuxERP specification site

Base infrastructure for digitalizing the Excel/XML order specification.

## Stack

- Next.js App Router, React and TypeScript
- Tailwind CSS
- Prisma ORM with PostgreSQL
- Vitest for calculation tests
- `fast-xml-parser` and `exceljs` for Excel XML / XLSX import previews
- Playwright reserved for PDF generation and end-to-end checks
- Docker Compose with PostgreSQL and optional Redis

## Start locally

```powershell
copy .env.example .env
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run dev
```

Open `http://localhost:3000/orders`.

Set `AUTH_SECRET` and `AUTH_BOOTSTRAP_PIN` in `.env` before starting the app.

## Required auth configuration

The app refuses to start unless both of these values are explicitly set:

- `AUTH_SECRET` must be at least 32 characters long and must not use a placeholder value.
- `AUTH_BOOTSTRAP_PIN` must contain exactly 6 digits and must not use a common/default PIN.

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
npm.cmd run prisma:migrate
npm.cmd run prisma:push
npm.cmd run orders:sync
docker compose up --build
```

## Tests

- `npm.cmd run test` runs all Vitest checks: calculations, import parsing, customer summaries and the API route contract.
- `npm.cmd run test:routes` verifies that `docs/architecture.md` lists the same API methods and paths that exist under `app/api/**/route.ts`.

## Public hosting through VDS

For publishing the local app through a VDS with `WireGuard` and `Caddy`, see [docs/vds-wireguard-caddy.md](docs/vds-wireguard-caddy.md).

For a short practical deployment note covering local production launch, second-PC access, public domain access and current PWA state, see [docs/deployment-short.md](docs/deployment-short.md).

## PostgreSQL mode

The app can read/write orders through Prisma when `DATABASE_URL` is set and PostgreSQL is reachable. If the database is unavailable, it falls back to local `.data/orders` files.

```powershell
copy .env.example .env
docker compose up postgres -d
npm.cmd run prisma:push
npm.cmd run orders:sync
npm.cmd run dev
```

## Data and local artifacts

- `.env`, `.env.local`, `.data`, logs, build output and test reports are ignored by git.
- `.env.example` is intentionally tracked as the setup template.
- In file mode, orders are stored under `.data/orders`, dictionaries under `.data/dictionaries.json`, users under `.data/users.json`, and import artifacts under `.data/imports`.
- Current local temporary files are marked in [docs/local-artifacts.md](docs/local-artifacts.md).
- Before publishing the app, set a strong `AUTH_SECRET` and a unique `AUTH_BOOTSTRAP_PIN`.

## Encoding note

Russian text in source files may look corrupted when read through some PowerShell commands or terminal output, even if the file itself is valid UTF-8. In particular, strings like `РЎРїРµ...` can be a console rendering artifact rather than real mojibake in the code.

If you suspect broken encoding:

- trust the IDE or raw UTF-8 file content over a single terminal rendering;
- verify the file with a UTF-8-aware reader such as Node.js `fs.readFileSync(path, "utf8")`;
- do not rewrite strings only because PowerShell displayed them incorrectly.

## Current state

The app includes calculation utilities, order list/card/edit/create screens, PIN-based authentication, role-gated user and dictionary management, XML/XLSX import preview and confirmation, editable specification lines, payment management, printable HTML and a Prisma schema matching the documented entities.

Write endpoints are active for orders, order lines, payments, dictionaries, users and import confirmation. The order store uses Prisma/PostgreSQL when `DATABASE_URL` is configured and reachable, and also writes JSON files under `.data/orders` as a fallback/local artifact.
