# LuxERP digital specification architecture

## Scope

The application follows the supplied Excel/XML digitalization specification and targets an MVP built on Next.js, TypeScript, PostgreSQL, Prisma and Tailwind CSS.

## Domain boundaries

- `orders` stores the specification header, dates, customer links, product parameters and calculated totals.
- `specification_lines` stores every visible or technical row in the grouped table, including groups, products, services, comments, discounts and surcharges.
- `payments` stores prepayments, final payments, refunds and corrections.
- `order_status_history` stores production status changes.
- Dictionary tables store categories, material types, thicknesses, milling types and legal types with soft deactivation.
- `attachments` and `audit_log` are reserved for imported XML/XLSX files, generated PDFs and traceability.

## MVP screens

- `/orders` shows the order list with status, dates, amount, prepayment and balance.
- `/orders/[id]` shows the order card with customer data, product parameters, grouped lines and totals.
- `/orders/new` creates manual orders.
- `/orders/[id]/edit` edits order fields and specification lines.
- `/import` previews and confirms Excel XML / XLSX imports.
- `/dictionaries` manages dictionaries.
- `/users` manages PIN users for administrators.
- `/api/orders/[id]/print` returns a printable HTML specification that can later be rendered to PDF through Playwright.

## API surface

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/customers`
- `PATCH /api/customers/:key`
- `GET /api/dictionaries`
- `POST /api/dictionaries/:type`
- `PATCH /api/dictionaries/:type/:id`
- `DELETE /api/dictionaries/:type/:id`
- `POST /api/import/specification`
- `POST /api/import/specification/confirm`
- `GET /api/import/specification/preview`
- `POST /api/import/specification/preview`
- `GET /api/orders`
- `POST /api/orders`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id`
- `DELETE /api/orders/:id`
- `POST /api/orders/:id/status`
- `GET /api/orders/:id/lines`
- `POST /api/orders/:id/lines`
- `PATCH /api/orders/:id/lines`
- `DELETE /api/orders/:id/lines`
- `GET /api/orders/:id/payments`
- `POST /api/orders/:id/payments`
- `DELETE /api/orders/:id/payments`
- `GET /api/orders/:id/pdf`
- `GET /api/orders/:id/print`
- `GET /api/orders/:id/xlsx`
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`

Write endpoints are connected to Zod validation and the hybrid order store. The order store uses Prisma/PostgreSQL when reachable and falls back to JSON files under `.data`.

## Next implementation steps

1. Add a repeatable seed/setup flow for dictionaries and the bootstrap user.
2. Add smoke/e2e coverage for login, order creation, import preview and edit flows.
3. Expand import mapping for more historical Excel/XML layout variants.
4. Generate PDF from the print route through Playwright.
5. Add audit records for important order, payment and user changes.
