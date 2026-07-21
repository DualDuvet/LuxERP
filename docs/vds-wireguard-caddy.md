# VDS hosting through WireGuard and Caddy

This setup keeps the LuxERP app running on the local machine and publishes it through a VDS:

`local Next.js app -> WireGuard tunnel -> VDS -> Caddy -> https://luxerp.ru`

It fits this project well because LuxERP can run in file mode without PostgreSQL. Better Auth uses a local SQLite file:

- set `ORDER_STORE="file"` in `.env`;
- keep local data in `.data/orders` and `prisma/auth/auth.db`;
- expose only the local app on port `3000` to the VDS over WireGuard.

## 1. Local app preparation

1. Copy `.env.example` to `.env`.
2. Set a strong `AUTH_SECRET`.
3. Keep `ORDER_STORE="file"` for the current tunnel deployment.
4. Install dependencies and build:

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:auth:deploy
npm.cmd run build
```

5. Start the app so it listens on all interfaces:

```powershell
npm.cmd run start:tunnel
```

Configure the bootstrap admin through `AUTH_BOOTSTRAP_USERNAME` and `AUTH_BOOTSTRAP_PHRASE` in `.env`; never publish the phrase in documentation.

## 2. DNS

Point the public DNS records to the VDS:

- `A luxerp.ru -> 80.249.146.233`
- `A www.luxerp.ru -> 80.249.146.233`

Wait until the records resolve before requesting TLS certificates from Caddy.

## 3. Install packages on the VDS

Ubuntu/Debian example:

```bash
apt update
apt install -y wireguard caddy
systemctl enable caddy
systemctl enable wg-quick@luxerp
```

Open the required ports:

- `80/tcp`
- `443/tcp`
- `51820/udp`

## 4. Generate WireGuard keys

On the VDS:

```bash
umask 077
wg genkey | tee /etc/wireguard/luxerp-private.key | wg pubkey > /etc/wireguard/luxerp-public.key
```

On the local Windows machine, generate another key pair with WireGuard and keep the private key only in the client config.

## 5. WireGuard configuration

Use these templates:

- VDS: `infra/wireguard/luxerp-vds.conf.example`
- Local Windows client: `infra/wireguard/luxerp-local.conf.example`

Replace:

- `<VDS_PRIVATE_KEY>`
- `<VDS_PUBLIC_KEY>`
- `<LOCAL_PRIVATE_KEY>`
- `<LOCAL_PUBLIC_KEY>`

VDS target path:

```bash
/etc/wireguard/luxerp.conf
```

Then start the tunnel on the VDS:

```bash
systemctl enable --now wg-quick@luxerp
wg show
```

Import the local config into the Windows WireGuard client and activate it there as well.

Expected tunnel IPs:

- VDS: `10.77.0.1`
- local app host: `10.77.0.2`

## 6. Caddy configuration

Copy `infra/caddy/Caddyfile.example` to the VDS as:

```bash
/etc/caddy/Caddyfile
```

Then validate and reload:

```bash
caddy fmt --overwrite /etc/caddy/Caddyfile
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
systemctl status caddy --no-pager
```

The sample config proxies `luxerp.ru` to `10.77.0.2:3000` over WireGuard and redirects `www.luxerp.ru` to the apex domain.

## 7. Verification

From the VDS:

```bash
curl -I http://10.77.0.2:3000/login
curl -I https://luxerp.ru/login
```

From the local machine:

```powershell
Invoke-WebRequest -Uri "https://luxerp.ru/login" -UseBasicParsing
```

## 8. Notes

- `next dev` can be exposed through the tunnel for short-lived testing with `npm.cmd run dev:tunnel`, but `npm.cmd run start:tunnel` is the safer public mode.
- Keep WireGuard private keys out of the repository.
- If Caddy fails to issue certificates, first re-check DNS resolution and that ports `80` and `443` are open on the VDS.
