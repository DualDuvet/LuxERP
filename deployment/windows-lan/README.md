# LuxERP Windows LAN Kit

This folder contains the basic files for moving LuxERP to another Windows PC
and launching it in the local production network.

Recommended first launch mode:

```env
ORDER_STORE="file"
```

Quick order:

1. Install Node.js LTS on the server PC.
2. Copy the project to the new PC.
3. Run `01-prepare-new-pc.cmd`.
4. Edit `.env`.
5. Run `04-open-firewall-3000.cmd` as Administrator once.
6. Run `02-run-server.cmd`.
7. Run `05-check-server.cmd`.

Files in this folder:

- `01-prepare-new-pc.cmd` - install dependencies, generate Prisma client, build the app
- `02-run-server.cmd` - start LuxERP on `0.0.0.0:3000`
- `03-backup-data.cmd` - create a local backup of `.data` and `.env`
- `04-open-firewall-3000.cmd` - allow inbound TCP 3000 in Windows Firewall
- `05-check-server.cmd` - show local IP addresses and check `http://127.0.0.1:3000/api/health`

Notes:

- The server PC should have a stable local IP in TP-Link Deco.
- All users should open LuxERP through the same server PC in a browser.
- In `file` mode, back up `.data` every day.
- Do not use `next dev` for production workstations.

Local network URL format:

```text
http://SERVER_IP:3000/orders
```
