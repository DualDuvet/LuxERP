import type { DictionaryItem } from "@/lib/types";

export type ManagedDictionaryType =
  | "productCategories"
  | "materialTypes"
  | "thicknesses"
  | "millingTypes"
  | "legalTypes";

export type LegalTypeDictionaryItem = DictionaryItem & {
  code: string;
};

export type DictionariesState = {
  productCategories: DictionaryItem[];
  materialTypes: DictionaryItem[];
  thicknesses: DictionaryItem[];
  millingTypes: DictionaryItem[];
  legalTypes: LegalTypeDictionaryItem[];
  statuses: DictionaryItem[];
};

export const managedDictionaryTypes: ManagedDictionaryType[] = [
  "productCategories",
  "materialTypes",
  "thicknesses",
  "millingTypes",
  "legalTypes"
];

export const dictionaryTypeLabels: Record<ManagedDictionaryType, string> = {
  productCategories: "Категории",
  materialTypes: "Материалы / покрытия",
  thicknesses: "Толщины",
  millingTypes: "Фрезеровки",
  legalTypes: "Типы лиц"
};

export const dictionaries: DictionariesState = {
  productCategories: [
    { id: "category-paint", name: "покраска", isActive: true },
    { id: "category-pvc", name: "ПВХ", isActive: true },
    { id: "category-veneer", name: "шпон", isActive: true }
  ],
  materialTypes: [
    { id: "material-matte-lam", name: "мат/лам", isActive: true },
    { id: "material-matte-matte", name: "мат/мат", isActive: true },
    { id: "material-gloss-lam", name: "глянец/лам", isActive: true },
    { id: "material-gloss-matte", name: "глянец/мат", isActive: true },
    { id: "material-gloss-gloss", name: "глянец/глянец", isActive: true }
  ],
  thicknesses: [10, 16, 19, 22, 25, 32, 38].map((value) => ({
    id: `thickness-${value}`,
    name: `${value}`,
    isActive: true
  })),
  millingTypes: [
    "R 3",
    "R минимальный",
    "Альфа",
    "Ампир",
    "Антик",
    "без R",
    "Версаль",
    "Дрезден",
    "Лондон",
    "Неаполь"
  ].map((name) => ({ id: `milling-${name.toLowerCase().replaceAll(" ", "-")}`, name, isActive: true })),
  legalTypes: ["ООО", "ИП", "ч/л", "ЗАО"].map((code) => ({
    id: `legal-${code}`,
    code,
    name: code,
    isActive: true
  })),
  statuses: [
    { id: "draft", name: "Черновик", isActive: true },
    { id: "confirmed", name: "Подтвержден", isActive: true },
    { id: "in_production", name: "В производстве", isActive: true },
    { id: "on_hold", name: "Ожидание", isActive: true },
    { id: "ready", name: "Готов", isActive: true },
    { id: "shipped", name: "Отгружен", isActive: true },
    { id: "closed", name: "Закрыт", isActive: true },
    { id: "cancelled", name: "В архиве", isActive: true }
  ]
};
