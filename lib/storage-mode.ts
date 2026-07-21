export type StorageMode = "file" | "prisma";

export function getStorageMode(value = process.env.ORDER_STORE): StorageMode {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === "file") {
    return "file";
  }

  if (normalized === "prisma") {
    return "prisma";
  }

  throw new Error(`Unsupported ORDER_STORE value: ${value}`);
}
