# Progress log

## 2026-06-11

- Ran the first project-hygiene pass.
- Updated README and architecture notes to reflect active write endpoints, hybrid Prisma/file persistence, current screens and local artifact handling.
- Expanded `.gitignore` for local environment files, build metadata and test reports while keeping `.env.example` tracked.
- Removed the prefilled bootstrap PIN from the login form.

## 2026-06-06

- Read the compact and full digitalization specifications.
- Created the Next.js, TypeScript and Tailwind CSS application scaffold.
- Added domain types, calculation utilities and tests for specification totals.
- Added an initial mock order with grouped specification lines and payment data.
- Added order list, order card and printable specification views.
- Added API scaffolding for orders, lines, dictionaries and import preview/confirm.
- Added Prisma schema for orders, customers, lines, payments, statuses, dictionaries, users, attachments and audit log.
- Added Docker Compose, Dockerfile, CI workflow, README and architecture notes.
- Verified `npm.cmd run test`, `npm.cmd run build`, `npm.cmd run prisma:generate` and `npm.cmd audit`.
- Started the local dev server at `http://127.0.0.1:3000/orders`.
- Added first real SpreadsheetML import preview parser.
- Fixed browser `Internal Server Error` caused by stale `.next` chunks after running `next build` while `next dev` was active; restarted dev server with a clean `.next`.
- Added `public/sw.js` to unregister any stale browser service worker from previous local runs.
- Added `/import` page with file upload, preview table and import confirmation.
- Implemented `POST /api/import/specification/preview` for uploaded Excel XML files.
- Implemented `POST /api/import/specification/confirm` to normalize preview data into an order and save a JSON import artifact under `.data/imports`.
- Added `.xlsx` preview support through `exceljs` with npm audit kept clean through dependency overrides.
- Stopped the stale `D:\LuxERP1` dev server that occupied port `3000`; restarted the current `D:\LuxERP1_1` app on `http://127.0.0.1:3000`.
- Connected confirmed imports to the order system: imported orders are now saved under `.data/orders` and appear in `/orders` and `/orders/[id]`.
- Reworked the print endpoint into an Excel-like specification form with dense borders, header blocks, product parameters, totals and the original wide line table.
- Updated Excel import parser to stop producing `comment` lines; blank rows in the specification table are now preserved as printable `empty` spacing rows.
- Prepared PostgreSQL persistence: adjusted Prisma ids for imported order strings, added Prisma order store with file fallback, generated initial migration and added `.data/orders` to Prisma sync script.
- Enabled basic manual order editing: added `PATCH /api/orders/:id` with Zod validation and a card form for status, dates, customer, product parameters and payment totals.
- Enabled manual specification line editing: added `PATCH /api/orders/:id/lines`, recalculation of line/order totals and an editable lines table in the order card.
- Added specification line creation/deletion through `POST` and `DELETE /api/orders/:id/lines`; fixed order storage updates so changed lines persist before recalculating totals.
