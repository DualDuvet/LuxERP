import "server-only";

import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { authPrisma } from "@/lib/auth-prisma";
import { auth } from "@/lib/better-auth";
import { isValidControlPhrase, normalizeControlPhrase } from "@/lib/auth-phrase";
import { getRoleLabel, userRoles } from "@/lib/roles";
import { getBootstrapPhrase, getBootstrapUsername } from "@/lib/security-env";
import type { UserRole } from "@/lib/types";

export { getRoleLabel, userRoles };

export type CurrentUser = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
};

export type ManagedUser = CurrentUser & {
  isActive: boolean;
};

function isUserRole(value: string): value is UserRole {
  return userRoles.includes(value as UserRole);
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function isValidUsername(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,29}$/i.test(value);
}

function localAuthEmail(username: string) {
  return `${username}@local.luxerp`;
}

function toManagedUser(user: {
  id: string;
  username: string | null;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
}): ManagedUser {
  if (!isUserRole(user.role)) {
    throw new Error("Invalid user role.");
  }

  return {
    id: user.id,
    username: user.username ?? "",
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive
  };
}

let bootstrapPromise: Promise<void> | undefined;

async function ensureBootstrapUser() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const username = getBootstrapUsername();
      const existing = await authPrisma.user.findUnique({
        where: { username },
        select: { id: true, username: true, email: true, name: true, role: true, isActive: true }
      });

      if (existing) {
        const account = await authPrisma.account.findFirst({
          where: { userId: existing.id, providerId: "credential" },
          select: { id: true }
        });

        if (!account) {
          await authPrisma.account.create({
            data: {
              id: `account-${randomUUID()}`,
              accountId: existing.id,
              providerId: "credential",
              userId: existing.id,
              password: await hashPassword(normalizeControlPhrase(getBootstrapPhrase()))
            }
          });
        }

        return;
      }

      await createManagedUser({
        username,
        name: process.env.AUTH_BOOTSTRAP_NAME?.trim() || "Администратор",
        role: "admin",
        phrase: getBootstrapPhrase()
      });
    })().catch((error) => {
      bootstrapPromise = undefined;
      throw error;
    });
  }

  await bootstrapPromise;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  await ensureBootstrapUser();
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session?.user?.id) {
    return null;
  }

  const user = await authPrisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true
    }
  });

  if (!user || !user.isActive || !isUserRole(user.role)) {
    return null;
  }

  return toManagedUser(user);
}

export async function listManagedUsers() {
  const users = await authPrisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true
    }
  });

  return users.flatMap((user) => (isUserRole(user.role) ? [toManagedUser(user)] : []));
}

export async function createManagedUser(input: {
  username: string;
  name: string;
  role: UserRole;
  phrase: string;
}) {
  const username = normalizeUsername(input.username);
  const phrase = normalizeControlPhrase(input.phrase);

  if (!isValidUsername(username)) {
    throw new Error("Login must contain 3-30 Latin letters, digits, dots, underscores or hyphens.");
  }

  if (!isValidControlPhrase(phrase)) {
    throw new Error("Control phrase must contain exactly three words.");
  }

  if (!isUserRole(input.role)) {
    throw new Error("Invalid user role.");
  }

  const email = localAuthEmail(username);
  const existing = await authPrisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    },
    select: { id: true }
  });

  if (existing) {
    throw new Error("This login is already in use.");
  }

  const password = await hashPassword(phrase);
  const user = await authPrisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        id: `user-${randomUUID()}`,
        username,
        displayUsername: username,
        email,
        name: input.name.trim(),
        emailVerified: false,
        role: input.role,
        isActive: true
      }
    });

    await transaction.account.create({
      data: {
        id: `account-${randomUUID()}`,
        accountId: createdUser.id,
        providerId: "credential",
        userId: createdUser.id,
        password
      }
    });

    return createdUser;
  });

  return toManagedUser(user);
}

export async function updateManagedUser(
  id: string,
  input: {
    username?: string;
    name?: string;
    role?: UserRole;
    isActive?: boolean;
    phrase?: string;
  }
) {
  const current = await authPrisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      role: true,
      isActive: true
    }
  });

  if (!current) {
    return null;
  }

  const username = input.username === undefined ? undefined : normalizeUsername(input.username);
  const phrase = input.phrase ? normalizeControlPhrase(input.phrase) : undefined;

  if (username !== undefined && !isValidUsername(username)) {
    throw new Error("Login must contain 3-30 Latin letters, digits, dots, underscores or hyphens.");
  }

  if (phrase !== undefined && !isValidControlPhrase(phrase)) {
    throw new Error("Control phrase must contain exactly three words.");
  }

  if (input.role !== undefined && !isUserRole(input.role)) {
    throw new Error("Invalid user role.");
  }

  if (username && username !== current.username) {
    const duplicate = await authPrisma.user.findUnique({
      where: { username },
      select: { id: true }
    });

    if (duplicate && duplicate.id !== id) {
      throw new Error("This login is already in use.");
    }
  }

  const password = phrase ? await hashPassword(phrase) : undefined;
  const user = await authPrisma.$transaction(async (transaction) => {
    const updatedUser = await transaction.user.update({
      where: { id },
      data: {
        username,
        displayUsername: username,
        name: input.name?.trim(),
        role: input.role,
        isActive: input.isActive
      }
    });

    if (password) {
      const credentialAccount = await transaction.account.findFirst({
        where: { userId: id, providerId: "credential" },
        select: { id: true }
      });

      if (credentialAccount) {
        await transaction.account.update({
          where: { id: credentialAccount.id },
          data: { password }
        });
      } else {
        await transaction.account.create({
          data: {
            id: `account-${randomUUID()}`,
            accountId: id,
            providerId: "credential",
            userId: id,
            password
          }
        });
      }
    }

    if (password || input.isActive === false) {
      await transaction.session.deleteMany({ where: { userId: id } });
    }

    return updatedUser;
  });

  return toManagedUser(user);
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
    return {
      user: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return { user, response: null };
}

export async function requireApiRole(roles: UserRole[]) {
  const { user, response } = await requireApiUser();

  if (response) {
    return { user: null, response };
  }

  if (!roles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 })
    };
  }

  return { user, response: null };
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
