import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  dictionaries as seedDictionaries,
  managedDictionaryTypes,
  type DictionariesState,
  type LegalTypeDictionaryItem,
  type ManagedDictionaryType
} from "@/lib/dictionaries";
import type { DictionaryItem } from "@/lib/types";

const dataDir = path.join(process.cwd(), ".data");
const dictionariesFile = path.join(dataDir, "dictionaries.json");

function cloneSeed(): DictionariesState {
  return structuredClone(seedDictionaries);
}

function isManagedDictionaryType(value: string): value is ManagedDictionaryType {
  return managedDictionaryTypes.includes(value as ManagedDictionaryType);
}

function sortItems<T extends DictionaryItem>(items: T[]) {
  return [...items].sort((first, second) => first.name.localeCompare(second.name, "ru"));
}

async function readStoredDictionaries() {
  try {
    const content = await readFile(dictionariesFile, "utf8");
    return JSON.parse(content) as Partial<DictionariesState>;
  } catch {
    return {};
  }
}

async function writeStoredDictionaries(dictionaries: DictionariesState) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(dictionariesFile, JSON.stringify(dictionaries, null, 2), "utf8");
}

export function assertManagedDictionaryType(type: string) {
  if (!isManagedDictionaryType(type)) {
    throw new Error("Unknown dictionary type");
  }

  return type;
}

export async function listDictionaries(): Promise<DictionariesState> {
  const stored = await readStoredDictionaries();
  const merged = cloneSeed();

  for (const type of managedDictionaryTypes) {
    if (stored[type]) {
      merged[type] = stored[type] as never;
    }
  }

  return {
    ...merged,
    productCategories: sortItems(merged.productCategories),
    materialTypes: sortItems(merged.materialTypes),
    thicknesses: [...merged.thicknesses].sort((first, second) => Number(first.name) - Number(second.name)),
    millingTypes: sortItems(merged.millingTypes),
    legalTypes: sortItems(merged.legalTypes),
    statuses: merged.statuses
  };
}

export function activeDictionaryItems<T extends DictionaryItem>(items: T[], currentName?: string) {
  const activeItems = items.filter((item) => item.isActive);

  if (!currentName || activeItems.some((item) => item.name === currentName)) {
    return activeItems;
  }

  const currentItem = items.find((item) => item.name === currentName);
  return currentItem ? [...activeItems, currentItem] : activeItems;
}

function makeId(type: ManagedDictionaryType) {
  return `${type}-${randomUUID()}`;
}

function uniqueName(items: DictionaryItem[], name: string, exceptId?: string) {
  return !items.some((item) => item.id !== exceptId && item.name.trim().toLowerCase() === name.trim().toLowerCase());
}

export async function createDictionaryItem(type: ManagedDictionaryType, payload: Record<string, unknown>) {
  const dictionaries = await listDictionaries();

  if (type === "legalTypes") {
    const code = String(payload.code ?? "").trim();
    const name = String(payload.name ?? code).trim();

    if (!code || !name) {
      throw new Error("Code and name are required");
    }

    if (!uniqueName(dictionaries.legalTypes, name) || dictionaries.legalTypes.some((item) => item.code === code)) {
      throw new Error("Dictionary value already exists");
    }

    const item: LegalTypeDictionaryItem = { id: makeId(type), code, name, isActive: true };
    dictionaries.legalTypes = sortItems([...dictionaries.legalTypes, item]);
    await writeStoredDictionaries(dictionaries);
    return item;
  }

  const name = type === "thicknesses" ? String(Number(payload.valueMm ?? payload.name)) : String(payload.name ?? "").trim();

  if (!name || (type === "thicknesses" && (!Number.isFinite(Number(name)) || Number(name) <= 0))) {
    throw new Error("Dictionary value is required");
  }

  if (!uniqueName(dictionaries[type], name)) {
    throw new Error("Dictionary value already exists");
  }

  const item: DictionaryItem = { id: makeId(type), name, isActive: true };
  dictionaries[type] = sortItems([...dictionaries[type], item]) as never;
  await writeStoredDictionaries(dictionaries);
  return item;
}

export async function updateDictionaryItem(
  type: ManagedDictionaryType,
  id: string,
  payload: Record<string, unknown>
) {
  const dictionaries = await listDictionaries();
  const items = dictionaries[type] as Array<DictionaryItem | LegalTypeDictionaryItem>;
  const current = items.find((item) => item.id === id);

  if (!current) {
    return null;
  }

  const isActive = typeof payload.isActive === "boolean" ? payload.isActive : current.isActive;

  if (type === "legalTypes") {
    const currentLegal = current as LegalTypeDictionaryItem;
    const code = String(payload.code ?? currentLegal.code).trim();
    const name = String(payload.name ?? currentLegal.name).trim();

    if (!code || !name) {
      throw new Error("Code and name are required");
    }

    const duplicate = dictionaries.legalTypes.some(
      (item) => item.id !== id && (item.code.trim().toLowerCase() === code.toLowerCase() || item.name.trim().toLowerCase() === name.toLowerCase())
    );

    if (duplicate) {
      throw new Error("Dictionary value already exists");
    }

    const nextItem: LegalTypeDictionaryItem = { ...currentLegal, code, name, isActive };
    dictionaries.legalTypes = sortItems(dictionaries.legalTypes.map((item) => (item.id === id ? nextItem : item)));
    await writeStoredDictionaries(dictionaries);
    return nextItem;
  }

  const name = type === "thicknesses" ? String(Number(payload.valueMm ?? payload.name ?? current.name)) : String(payload.name ?? current.name).trim();

  if (!name || (type === "thicknesses" && (!Number.isFinite(Number(name)) || Number(name) <= 0))) {
    throw new Error("Dictionary value is required");
  }

  if (!uniqueName(dictionaries[type], name, id)) {
    throw new Error("Dictionary value already exists");
  }

  const nextItem: DictionaryItem = { ...current, name, isActive };
  dictionaries[type] = sortItems(dictionaries[type].map((item) => (item.id === id ? nextItem : item))) as never;
  await writeStoredDictionaries(dictionaries);
  return nextItem;
}

export async function deactivateDictionaryItem(type: ManagedDictionaryType, id: string) {
  return updateDictionaryItem(type, id, { isActive: false });
}
