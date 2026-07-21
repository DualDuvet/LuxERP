# Security Remediation

## Tasks

- [x] 2. Revalidate sessions against the current user record so deactivated users and changed roles take effect immediately.
- [x] 3. Fix the authorized-user open redirect on `/login?next=...`.
- [x] 4. Add rate limiting / lockout for local username sign-in.
- [x] 5. Restrict payment reads to the intended financial roles.
- [x] 6. Add resource limits for XML/XLSX import and PDF generation.
- [x] 7. Remove real-looking secrets/PINs from examples and docs.
- [x] 8. Harden Docker exposure and default service credentials.

## Log

- 2026-06-16: Created remediation tracker after fixing item 1.
- 2026-06-16: Item 2 fixed in server auth: `getCurrentUser()` now resolves the signed token user id against active stored users and returns the current role.
- 2026-06-16: Item 3 fixed: login POST and page now share `safeNextPath()` and reject protocol-relative redirects.
- 2026-06-16: Item 4 fixed: local sign-in limits repeated failed attempts through Better Auth rate limiting.
- 2026-06-16: Item 5 fixed: payment GET and SSR payment rendering are limited to `admin` and `accountant`.
- 2026-06-16: Item 6 fixed: import previews reject files over 8 MB and PDF generation is capped to one active Chromium render per process.
- 2026-06-16: Item 7 fixed: `.env.example` and README no longer publish reusable-looking auth secrets or bootstrap PINs.
- 2026-06-16: Item 8 fixed: compose no longer publishes Postgres/Redis host ports and requires explicit auth/database secrets from `.env`.
- 2026-06-16: Local dev follow-up: Postgres is exposed on `127.0.0.1:5432` only so host-run Next/Prisma can connect without opening the database to the LAN.
