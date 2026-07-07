"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import {
  dictionaryTypeLabels,
  managedDictionaryTypes,
  type DictionariesState,
  type LegalTypeDictionaryItem,
  type ManagedDictionaryType
} from "@/lib/dictionaries";
import type { DictionaryItem } from "@/lib/types";

function isLegalTypeItem(item: DictionaryItem | LegalTypeDictionaryItem): item is LegalTypeDictionaryItem {
  return "code" in item;
}

function buildPayload(type: ManagedDictionaryType, formData: FormData) {
  if (type === "legalTypes") {
    return {
      code: formData.get("code"),
      name: formData.get("name"),
      isActive: formData.get("isActive") === "on"
    };
  }

  if (type === "thicknesses") {
    return {
      valueMm: formData.get("valueMm"),
      isActive: formData.get("isActive") === "on"
    };
  }

  return {
    name: formData.get("name"),
    isActive: formData.get("isActive") === "on"
  };
}

export function DictionariesManagement({
  dictionaries,
  canEdit
}: {
  dictionaries: DictionariesState;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function refreshAfter(response: Response, fallbackError: string) {
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? fallbackError);
      return;
    }

    setError("");
    startTransition(() => router.refresh());
  }

  async function createItem(type: ManagedDictionaryType, formData: FormData) {
    const response = await fetch(`/api/dictionaries/${type}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(type, formData))
    });

    await refreshAfter(response, "Не удалось создать значение справочника");
  }

  async function updateItem(type: ManagedDictionaryType, id: string, formData: FormData) {
    const response = await fetch(`/api/dictionaries/${type}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildPayload(type, formData))
    });

    await refreshAfter(response, "Не удалось сохранить значение справочника");
  }

  async function deactivateItem(type: ManagedDictionaryType, id: string) {
    const response = await fetch(`/api/dictionaries/${type}/${id}`, {
      method: "DELETE"
    });

    await refreshAfter(response, "Не удалось отключить значение справочника");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Справочники</h1>
        <p className="mt-1 text-sm text-muted">
          Категории, материалы, толщины, фрезеровки и типы лиц. Удаление мягкое: значение становится неактивным.
        </p>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {managedDictionaryTypes.map((type) => {
        const items = dictionaries[type] as Array<DictionaryItem | LegalTypeDictionaryItem>;

        return (
          <section key={type} className="rounded-md border border-line bg-white shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
              <div>
                <h2 className="font-semibold text-ink">{dictionaryTypeLabels[type]}</h2>
                <p className="text-sm text-muted">
                  Активных: {items.filter((item) => item.isActive).length} из {items.length}
                </p>
              </div>
              {!canEdit ? <span className="text-xs text-muted">Только просмотр</span> : null}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-panel text-left text-xs uppercase text-muted">
                  <tr>
                    {type === "legalTypes" ? <th className="px-4 py-2 font-medium">Код</th> : null}
                    <th className="px-4 py-2 font-medium">{type === "thicknesses" ? "Толщина, мм" : "Название"}</th>
                    <th className="px-4 py-2 font-medium">Активен</th>
                    {canEdit ? <th className="px-4 py-2" /> : null}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-line">
                      <td colSpan={canEdit ? (type === "legalTypes" ? 4 : 3) : type === "legalTypes" ? 3 : 2} className="p-0">
                        <form
                          action={(formData) => updateItem(type, item.id, formData)}
                          className={`grid items-center gap-3 px-4 py-3 ${
                            type === "legalTypes"
                              ? "grid-cols-[0.8fr_1.2fr_0.5fr_0.8fr]"
                              : "grid-cols-[1.4fr_0.5fr_0.8fr]"
                          }`}
                        >
                          {type === "legalTypes" && isLegalTypeItem(item) ? (
                            <input
                              name="code"
                              defaultValue={item.code}
                              disabled={!canEdit}
                              className="min-w-0 rounded-md border-line text-sm disabled:border-transparent disabled:bg-transparent disabled:p-0"
                              required
                            />
                          ) : null}
                          <input
                            name={type === "thicknesses" ? "valueMm" : "name"}
                            type={type === "thicknesses" ? "number" : "text"}
                            step={type === "thicknesses" ? "1" : undefined}
                            defaultValue={item.name}
                            disabled={!canEdit}
                            className="min-w-0 rounded-md border-line text-sm disabled:border-transparent disabled:bg-transparent disabled:p-0"
                            required
                          />
                          <label className="inline-flex items-center gap-2">
                            <input
                              name="isActive"
                              type="checkbox"
                              defaultChecked={item.isActive}
                              disabled={!canEdit}
                              className="rounded border-line"
                            />
                            <span className="text-xs text-muted">{item.isActive ? "да" : "нет"}</span>
                          </label>
                          {canEdit ? (
                            <div className="flex justify-end gap-2">
                              <button
                                className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm"
                                disabled={isPending}
                              >
                                <Save className="h-4 w-4" />
                                Сохранить
                              </button>
                              <button
                                type="button"
                                onClick={() => deactivateItem(type, item.id)}
                                disabled={isPending || !item.isActive}
                                className="inline-flex items-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 disabled:opacity-40"
                              >
                                <Trash2 className="h-4 w-4" />
                                Отключить
                              </button>
                            </div>
                          ) : null}
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {canEdit ? (
              <form action={(formData) => createItem(type, formData)} className="grid gap-3 border-t border-line p-4 text-sm md:grid-cols-4">
                {type === "legalTypes" ? (
                  <label className="space-y-1">
                    <span className="text-xs text-muted">Код</span>
                    <input name="code" className="w-full rounded-md border-line text-sm" required />
                  </label>
                ) : null}
                <label className={`space-y-1 ${type === "legalTypes" ? "" : "md:col-span-2"}`}>
                  <span className="text-xs text-muted">{type === "thicknesses" ? "Толщина, мм" : "Название"}</span>
                  <input
                    name={type === "thicknesses" ? "valueMm" : "name"}
                    type={type === "thicknesses" ? "number" : "text"}
                    step={type === "thicknesses" ? "1" : undefined}
                    className="w-full rounded-md border-line text-sm"
                    required
                  />
                </label>
                <input type="hidden" name="isActive" value="on" />
                <div className="flex items-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
                    disabled={isPending}
                  >
                    <Plus className="h-4 w-4" />
                    Добавить
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
