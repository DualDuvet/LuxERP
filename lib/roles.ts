import type { UserRole } from "@/lib/types";

export const userRoles = ["admin", "manager", "production", "accountant", "viewer"] as const;

export const roleLabels: Record<UserRole, string> = {
  admin: "Администратор",
  manager: "Менеджер",
  production: "Производство",
  accountant: "Бухгалтер",
  viewer: "Просмотр"
};

export function getRoleLabel(role: UserRole) {
  return roleLabels[role];
}
