import "server-only";

import { createHmac, pbkdf2Sync, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSecret, getBootstrapPin, validateSecurityEnv } from "@/lib/security-env";
import type { UserRole } from "@/lib/types";

export const sessionCookieName = "luxerp_session";

export const userRoles = ["admin", "manager", "production", "accountant", "viewer"] as const;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

type StoredUser = CurrentUser & {
  passwordHash: string;
  isActive: boolean;
};

export type ManagedUser = CurrentUser & {
  isActive: boolean;
};

const dataDir = path.join(process.cwd(), ".data");
const usersFile = path.join(dataDir, "users.json");
const sessionMaxAgeSeconds = 60 * 60 * 12;

const roleLabels: Record<UserRole, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  production: "Производство",
  accountant: "Бухгалтер",
  viewer: "Просмотр"
};

function secret() {
  return getAuthSecret();
}

function encodeBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function safeEqual(first: string, second: string) {
  const firstBuffer = Buffer.from(first);
  const secondBuffer = Buffer.from(second);

  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function hashSecret(secretValue: string, salt = randomBytes(16).toString("base64url")) {
  const hash = pbkdf2Sync(secretValue, salt, 120000, 32, "sha256").toString("base64url");
  return `pbkdf2$${salt}$${hash}`;
}

function verifySecret(secretValue: string, passwordHash: string) {
  const [method, salt, expectedHash] = passwordHash.split("$");

  if (method !== "pbkdf2" || !salt || !expectedHash) {
    return false;
  }

  const actualHash = hashSecret(secretValue, salt).split("$")[2];
  return safeEqual(actualHash, expectedHash);
}

function isSixDigitPin(value: string) {
  return /^\d{6}$/.test(value);
}

function toManagedUser(user: StoredUser): ManagedUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  };
}

function normalizeEmail(value: string | undefined, id: string) {
  const email = value?.trim().toLowerCase();
  return email || `${id}@pin.local`;
}

async function canUsePrismaUsers() {
  if (process.env.ORDER_STORE === "file" || !process.env.DATABASE_URL) {
    return false;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

async function readFileUsers() {
  try {
    const content = await readFile(usersFile, "utf8");
    return JSON.parse(content) as StoredUser[];
  } catch {
    return [];
  }
}

async function writeFileUsers(users: StoredUser[]) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(usersFile, JSON.stringify(users, null, 2), "utf8");
}

async function listUsers() {
  if (await canUsePrismaUsers()) {
    const users = await prisma.user.findMany();
    return users.map<StoredUser>((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      isActive: user.isActive
    }));
  }

  return readFileUsers();
}

async function createUser(user: StoredUser) {
  if (await canUsePrismaUsers()) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive
      }
    });
    return;
  }

  const users = await readFileUsers();
  await writeFileUsers([...users, user]);
}

async function updateStoredUser(user: StoredUser) {
  if (await canUsePrismaUsers()) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        name: user.name,
        passwordHash: user.passwordHash,
        role: user.role,
        isActive: user.isActive
      }
    });
    return;
  }

  const users = await readFileUsers();
  await writeFileUsers(users.map((item) => (item.id === user.id ? user : item)));
}

async function getActiveUserById(id: string | undefined) {
  if (!id) {
    return null;
  }

  await ensureBootstrapUser();

  const user = (await listUsers()).find((item) => item.id === id);

  if (!user?.isActive) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  } satisfies CurrentUser;
}

export function getRoleLabel(role: UserRole) {
  return roleLabels[role];
}

export function canManageOrders(role: UserRole) {
  return role === "admin" || role === "manager";
}

export function canManagePayments(role: UserRole) {
  return role === "admin" || role === "accountant";
}

export function canManageProduction(role: UserRole) {
  return role === "admin" || role === "production";
}

export function hasAnyRole(user: CurrentUser | null, roles: UserRole[]) {
  return Boolean(user && roles.includes(user.role));
}

async function assertPinAvailable(pin: string, exceptUserId?: string) {
  if (!isSixDigitPin(pin)) {
    throw new Error("PIN must contain exactly 6 digits");
  }

  const users = await listUsers();
  const duplicate = users.find((user) => user.id !== exceptUserId && verifySecret(pin, user.passwordHash));

  if (duplicate) {
    throw new Error("PIN is already used");
  }
}

export async function listManagedUsers() {
  await ensureBootstrapUser();
  const users = await listUsers();
  return users.map(toManagedUser).sort((first, second) => first.name.localeCompare(second.name));
}

export async function createManagedUser(input: {
  name: string;
  email?: string;
  role: UserRole;
  pin: string;
}) {
  await ensureBootstrapUser();
  await assertPinAvailable(input.pin);

  const id = `user-${randomUUID()}`;
  const user: StoredUser = {
    id,
    email: normalizeEmail(input.email, id),
    name: input.name.trim(),
    passwordHash: hashSecret(input.pin),
    role: input.role,
    isActive: true
  };

  await createUser(user);
  return toManagedUser(user);
}

export async function updateManagedUser(
  id: string,
  input: {
    name?: string;
    email?: string;
    role?: UserRole;
    isActive?: boolean;
    pin?: string;
  }
) {
  await ensureBootstrapUser();

  const user = (await listUsers()).find((item) => item.id === id);

  if (!user) {
    return null;
  }

  const nextUser: StoredUser = {
    ...user,
    name: input.name?.trim() || user.name,
    email: input.email === undefined ? user.email : normalizeEmail(input.email, user.id),
    role: input.role ?? user.role,
    isActive: input.isActive ?? user.isActive
  };

  if (input.pin) {
    await assertPinAvailable(input.pin, user.id);
    nextUser.passwordHash = hashSecret(input.pin);
  }

  await updateStoredUser(nextUser);
  return toManagedUser(nextUser);
}

export async function ensureBootstrapUser() {
  validateSecurityEnv();
  const users = await listUsers();
  const bootstrapPin = getBootstrapPin();

  if (users.length > 0) {
    const bootstrapUser = users.find((user) => user.id === "user-admin");

    if (bootstrapUser) {
      const nextBootstrapUser = {
        ...bootstrapUser,
        name: process.env.AUTH_BOOTSTRAP_NAME ?? "Администратор",
        passwordHash: (verifySecret("admin123", bootstrapUser.passwordHash) ||
          verifySecret("123456", bootstrapUser.passwordHash))
          ? hashSecret(bootstrapPin)
          : bootstrapUser.passwordHash
      };

      if (nextBootstrapUser.name !== bootstrapUser.name || nextBootstrapUser.passwordHash !== bootstrapUser.passwordHash) {
        await updateStoredUser(nextBootstrapUser);
      }
    }

    return;
  }

  await createUser({
    id: "user-admin",
    email: process.env.AUTH_BOOTSTRAP_EMAIL ?? "admin@luxerp.local",
    name: process.env.AUTH_BOOTSTRAP_NAME ?? "Администратор",
    passwordHash: hashSecret(bootstrapPin),
    role: "admin",
    isActive: true
  });
}

export async function authenticateByPin(pin: string) {
  validateSecurityEnv();
  await ensureBootstrapUser();

  if (!isSixDigitPin(pin)) {
    return null;
  }

  const user = (await listUsers()).find((item) => item.isActive && verifySecret(pin, item.passwordHash));

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  } satisfies CurrentUser;
}

export function createSessionToken(user: CurrentUser) {
  const payload = encodeBase64Url(
    JSON.stringify({
      user,
      expiresAt: Date.now() + sessionMaxAgeSeconds * 1000
    })
  );

  return `${payload}.${sign(payload)}`;
}

export function readSessionToken(token: string | undefined) {
  if (!token) {
    return null;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as {
      user?: CurrentUser;
      expiresAt?: number;
    };

    if (!session.user || !session.expiresAt || session.expiresAt < Date.now()) {
      return null;
    }

    if (!userRoles.includes(session.user.role)) {
      return null;
    }

    return session.user;
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionUser = readSessionToken(cookieStore.get(sessionCookieName)?.value);
  return getActiveUserById(sessionUser?.id);
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAnyRole(roles: UserRole[]) {
  const user = await requireUser();

  if (!roles.includes(user.role)) {
    redirect("/orders");
  }

  return user;
}

export async function requireApiUser() {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  return { user, response: null };
}

export async function requireApiRole(roles: UserRole[]) {
  const { user, response } = await requireApiUser();

  if (response) {
    return { user: null, response };
  }

  if (!roles.includes(user.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, response: null };
}

function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function shouldUseSecureCookie(request?: Request) {
  if (!request) {
    return process.env.NODE_ENV === "production";
  }

  const forwardedProtocol = firstHeaderValue(request.headers.get("x-forwarded-proto"));
  const requestProtocol = new URL(request.url).protocol.replace(":", "");

  return (forwardedProtocol ?? requestProtocol) === "https";
}

export function setSessionCookie(response: NextResponse, user: CurrentUser, request?: Request) {
  response.cookies.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}
