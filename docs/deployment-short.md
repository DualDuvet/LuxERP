# Краткий деплой LuxERP

## 1. Что важно по проекту

- Для разработки локально команда `npm.cmd run dev` запускается штатно.
- Для рабочего запуска на производстве лучше использовать не `dev`, а production-режим:
  - `npm.cmd run build`
  - `npm.cmd run start:tunnel`
- Проект может работать в двух режимах:
  - `PostgreSQL` через Prisma
  - `file mode` через `.data/**`

Для производственного локального ПК безопаснее и проще начать с `file mode`, если не нужна общая БД.

## 2. Рекомендованный локальный запуск на производстве

### Вариант A: самый простой

Использовать `file mode` на одном рабочем ПК:

1. Скопировать проект на производственный ПК.
2. Установить Node.js 22+.
3. Создать `.env` из `.env.example`.
4. В `.env` заполнить:
   - `AUTH_SECRET`
   - `AUTH_BOOTSTRAP_USERNAME`
   - `AUTH_BOOTSTRAP_PHRASE` (exactly three words)
   - `PUBLIC_APP_URL`
5. Включить:

```env
ORDER_STORE="file"
```

6. Установить зависимости:

```powershell
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:auth:deploy
```

7. Собрать проект:

```powershell
npm.cmd run build
```

8. Запустить на все интерфейсы:

```powershell
npm.cmd run start:tunnel
```

После этого приложение будет доступно в локальной сети по `http://IP_ПК:3000`.

### Вариант B: если нужна PostgreSQL

Лучше запускать через Docker Compose:

```powershell
copy .env.example .env
docker compose up -d postgres
npm.cmd install
npm.cmd run prisma:generate
npm.cmd run prisma:auth:deploy
npm.cmd run prisma:deploy
npm.cmd run orders:sync
# После проверки перенесённых данных: ORDER_STORE="prisma"
npm.cmd run build
npm.cmd run start:tunnel
```

## 3. Доступ с другого ПК в локальной сети

На рабочем ПК, где крутится LuxERP:

```powershell
npm.cmd run start:tunnel
```

Проверить доступность:

```powershell
Invoke-WebRequest -Uri http://127.0.0.1:3000
```

На другом ПК открыть:

```text
http://<локальный-ip-производственного-пк>:3000/orders
```

Нужно разрешить входящий TCP 3000 в Windows Firewall.

## 4. Доступ по домену из интернета

Рекомендованная схема:

```text
Локальный ПК с LuxERP -> WireGuard / reverse tunnel -> VDS -> Caddy/Nginx -> домен
```

В проекте уже есть заготовки:

- `docs/vds-wireguard-caddy.md`
- `infra/wireguard/*`
- `infra/caddy/Caddyfile.example`

Рекомендуемый порядок:

1. LuxERP работает локально на производственном ПК.
2. Между ПК и VDS поднимается WireGuard.
3. На VDS стоит Caddy.
4. Caddy проксирует домен на `10.77.0.2:3000` через WireGuard.

Для публичного доступа лучше использовать:

```powershell
npm.cmd run build
npm.cmd run start:tunnel
```

Не использовать `next dev` как постоянный внешний прод-режим.

## 5. PWA

В проект добавлена базовая подготовка под PWA:

- `public/manifest.webmanifest`
- `public/sw.js`
- регистрация service worker в layout

Что это даёт сейчас:

- приложение можно установить как web app;
- есть базовый offline-shell для основных маршрутов.

Что ещё нужно для полноценной PWA в производстве:

- нормальные PNG-иконки 192x192 и 512x512;
- стратегия кеширования API;
- отдельная проверка offline-сценариев.

## 6. Что я рекомендую как прод-схему

Если нужен быстрый и устойчивый запуск:

1. Производственный ПК:
   - `ORDER_STORE="file"`
   - `npm.cmd run build`
   - `npm.cmd run start:tunnel`
2. Данные регулярно бэкапить из:
   - `.data/orders`
   - `prisma/auth/auth.db`
   - `.data/dictionaries.json`
3. Для интернета:
   - WireGuard до VDS
   - Caddy на VDS
   - домен на VDS

Если позже понадобится многопользовательская устойчивая схема:

- вынести PostgreSQL в отдельный контейнер или на VDS;
- запускать приложение как контейнер/сервис;
- добавить мониторинг и резервное копирование БД.

## 7. Риски и замечания
