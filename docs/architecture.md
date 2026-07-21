# LuxERP digital specification architecture

## Scope

The application uses Next.js, TypeScript, Tailwind CSS and Prisma. Orders can use JSON files or PostgreSQL; Better Auth uses a separate SQLite database for local users, credentials, sessions and rate limiting.

## Domain boundaries

- `orders` stores the specification header, dates, customer links, product parameters and calculated totals.
- `specification_lines` stores every visible or technical row in the grouped table, including groups, products, services, comments, discounts and surcharges.
- `payments` stores prepayments, final payments, refunds and corrections.
- `order_status_history` stores production status changes.
- Dictionary tables store categories, material types, thicknesses, milling types and legal types with soft deactivation.
- `attachments` and `audit_log` are reserved for future documents, generated PDFs and traceability.

## MVP screens

- `/orders` shows the order list with status, dates, amount, prepayment and balance.
- `/orders/[id]` shows the order card with customer data, product parameters, grouped lines and totals.
- `/orders/new` creates manual orders.
- `/orders/[id]/edit` edits order fields and specification lines.
- `/dictionaries` manages dictionaries.
- `/users` manages local users, roles and control phrases for administrators.
- `/api/orders/[id]/print` returns a printable HTML specification that can later be rendered to PDF through Playwright.

## API surface

- `GET /api/customers`
- `PATCH /api/customers/:key`
- `GET /api/dictionaries`
- `POST /api/dictionaries/:type`
- `PATCH /api/dictionaries/:type/:id`
- `DELETE /api/dictionaries/:type/:id`
- `GET /api/health`
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

Better Auth handles local authentication under `/api/auth`, including username sign-in, session lookup and sign-out.

Write endpoints are connected to Zod validation. PostgreSQL order storage is selected through `ORDER_STORE="prisma"`; authentication remains on SQLite and is not coupled to order storage.

## Next implementation steps

1. Add a repeatable seed/setup flow for dictionaries and the bootstrap user.
2. Add smoke/e2e coverage for login, order creation and edit flows.
3. Rehearse and document the file-to-PostgreSQL migration on a copy of production data.
4. Generate PDF from the print route through Playwright.
5. Add audit records for important order, payment and user changes.
