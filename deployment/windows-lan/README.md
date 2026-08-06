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
8. Run `06-schedule-backup.cmd` to register the daily backup at 21:00.
9. Run `07-enable-autostart.cmd` to start the server automatically when Windows starts.

Files in this folder:

- `01-prepare-new-pc.cmd` - install dependencies, generate Prisma client, build the app
- `02-run-server.cmd` - start LuxERP on `0.0.0.0:3000`
- `03-backup-data.cmd` - create a timestamped local backup
- `04-open-firewall-3000.cmd` - allow inbound TCP 3000 in Windows Firewall
- `05-check-server.cmd` - show local IP addresses and check `http://127.0.0.1:3000/api/health`
- `06-schedule-backup.cmd` - register the daily backup task for 21:00
- `07-enable-autostart.cmd` - register the LuxERP server task for Windows startup

Notes:

- The server PC should have a stable local IP in TP-Link Deco.
- All users should open LuxERP through the same server PC in a browser.
- In `file` mode, the backup copies `.data\orders`, `.data\dictionaries.json`, `prisma\auth\auth.db`, and `.env`.
- The backup task runs daily at 21:00 using the local computer time.
- By default, backups are stored in `backups` in the project root. To use several destinations, edit `BACKUP_ROOTS` at the top of `03-backup-data.cmd` and separate paths with semicolons, for example: `set "BACKUP_ROOTS=backups;D:\LuxERP-backups;\\server\share\LuxERP"`.
- The autostart task waits 30 seconds after Windows starts, then launches the production server.
- Do not use `next dev` for production workstations.

Local network URL format:

```text
http://SERVER_IP:3000/orders
```
