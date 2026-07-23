"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  MoreHorizontal,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { PaymentsSection } from "@/components/payments-section";
import { StatusBadge } from "@/components/status-badge";
import { calculateGroupTotals, calculateLine, calculateOrderTotals, formatArea, formatMoney } from "@/lib/calculations";
import type { DictionariesState, LegalTypeDictionaryItem } from "@/lib/dictionaries";
import { linesInGroupOrder, normalizeLineOrder } from "@/lib/order-line-order";
import { canApplySavedSnapshot } from "@/lib/order-save-response";
import { getQrStatusChoices, orderStatusLabels, type QrStatusChoice } from "@/lib/order-status-flow";
import type {
  CustomerLookupItem,
  DictionaryItem,
  Order,
  OrderStatus,
  SpecificationLine,
  SpecificationLineType
} from "@/lib/types";

type SaveState = "clean" | "dirty" | "saving" | "saved" | "error";
type NumericLineField = "heightMm" | "widthMm" | "quantity" | "pricePerM2" | "unitPrice";
type EditableLineField = "lineType" | NumericLineField | "unit" | "description";

type OrderDraft = {
  specificationNumber: string;
  documentDate: string;
  customerId: string;
  customerName: string;
  customerLegalType: string;
  productionStartedAt: string;
  readyAt: string;
  category: string;
  materialType: string;
  millingType: string;
  thicknessMm: string;
  colorCode: string;
  mainNote: string;
  jointingNote: string;
  deliveryRequired: boolean;
  deliveryAddress: string;
};

type LineDraft = Omit<
  SpecificationLine,
  NumericLineField | "unitAreaM2" | "totalAreaM2" | "totalPrice"
> & {
  heightMm: string;
  widthMm: string;
  quantity: string;
  pricePerM2: string;
  unitPrice: string;
};

type PastePreview = {
  rows: string[][];
  startLineId: string;
  startField: EditableLineField;
  errors: string[];
};

const lineTypeLabels: Record<SpecificationLineType, string> = {
  group: "Группа",
  product: "Товар",
  service: "Услуга",
  comment: "Комментарий",
  empty: "Пустая строка",
  subtotal: "Подытог",
  total: "Итог",
  discount: "Скидка",
  surcharge: "Наценка"
};

const editableLineTypes: SpecificationLineType[] = [
  "group",
  "product",
  "service",
  "comment",
  "empty"
];

const pasteFields: Array<EditableLineField | null> = [
  "lineType",
  "heightMm",
  "widthMm",
  "quantity",
  "unit",
  "description",
  "pricePerM2",
  null,
  null,
  "unitPrice",
  null
];

const headerFields = new Map<string, EditableLineField>([
  ["тип", "lineType"],
  ["тип строки", "lineType"],
  ["высота", "heightMm"],
  ["высота, мм", "heightMm"],
  ["ширина", "widthMm"],
  ["ширина, мм", "widthMm"],
  ["количество", "quantity"],
  ["ед.", "unit"],
  ["ед", "unit"],
  ["описание", "description"],
  ["цена за м²", "pricePerM2"],
  ["цена за м2", "pricePerM2"],
  ["цена за ед.", "unitPrice"]
]);

function today() {
  return new Date().toISOString().slice(0, 10);
}

function valueOf(value: unknown) {
  return value == null ? "" : String(value);
}

function numberOf(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function makeDraftId() {
  return `draft-line-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyOrderDraft(defaultLegalType: string): OrderDraft {
  return {
    specificationNumber: "",
    documentDate: today(),
    customerId: "",
    customerName: "",
    customerLegalType: defaultLegalType,
    productionStartedAt: "",
    readyAt: "",
    category: "",
    materialType: "",
    millingType: "",
    thicknessMm: "",
    colorCode: "",
    mainNote: "",
    jointingNote: "",
    deliveryRequired: false,
    deliveryAddress: ""
  };
}

function orderToDraft(order: Order): OrderDraft {
  return {
    specificationNumber: order.specificationNumber,
    documentDate: order.documentDate,
    customerId: order.customer.id,
    customerName: order.customer.name,
    customerLegalType: order.customerLegalType,
    productionStartedAt: valueOf(order.productionStartedAt),
    readyAt: valueOf(order.readyAt),
    category: valueOf(order.category?.name),
    materialType: valueOf(order.materialType?.name),
    millingType: valueOf(order.millingType?.name),
    thicknessMm: valueOf(order.thicknessMm),
    colorCode: valueOf(order.colorCode),
    mainNote: valueOf(order.mainNote),
    jointingNote: valueOf(order.jointingNote),
    deliveryRequired: order.deliveryRequired ?? false,
    deliveryAddress: valueOf(order.deliveryAddress)
  };
}

function lineToDraft(line: SpecificationLine): LineDraft {
  return {
    ...line,
    heightMm: valueOf(line.heightMm),
    widthMm: valueOf(line.widthMm),
    quantity: valueOf(line.quantity),
    pricePerM2: valueOf(line.pricePerM2),
    unitPrice: valueOf(line.unitPrice)
  };
}

function draftToLine(line: LineDraft): SpecificationLine {
  return calculateLine({
    ...line,
    heightMm: numberOf(line.heightMm),
    widthMm: numberOf(line.widthMm),
    quantity: numberOf(line.quantity),
    pricePerM2: numberOf(line.pricePerM2),
    unitPrice: numberOf(line.unitPrice),
    isCalculated: line.lineType === "product" || line.lineType === "service"
  });
}

function newLine(type: SpecificationLineType, sortOrder: number, parentId: string | null): LineDraft {
  return lineToDraft({
    id: makeDraftId(),
    orderId: "draft",
    parentId: type === "group" ? null : parentId,
    lineType: type,
    sortOrder,
    title: type === "group" ? "Новая группа" : undefined,
    description: type === "product" ? "Новая позиция" : undefined,
    quantity: type === "product" || type === "service" ? 1 : undefined,
    unit: type === "product" || type === "service" ? "шт." : undefined,
    isCalculated: type === "product" || type === "service",
    isPrinted: true
  });
}

function parseTsv(text: string) {
  const rows: string[][] = [[]];
  let value = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "\t" && !quoted) {
      rows.at(-1)?.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }
      rows.at(-1)?.push(value);
      rows.push([]);
      value = "";
    } else {
      value += character;
    }
  }

  rows.at(-1)?.push(value);
  return rows.filter((row, index) => index < rows.length - 1 || row.some(Boolean));
}

function lineTypeFromText(value: string) {
  const normalized = value.trim().toLowerCase();
  return editableLineTypes.find(
    (type) => type === normalized || lineTypeLabels[type].toLowerCase() === normalized
  );
}

function activeItems<T extends { isActive: boolean }>(items: T[]) {
  return items.filter((item) => item.isActive);
}

function optionsWithCurrent<T extends DictionaryItem>(items: T[], currentName: string) {
  const active = activeItems(items);
  const current = items.find((item) => item.name === currentName);
  return current && !active.some((item) => item.id === current.id) ? [...active, current] : active;
}

function legalOptionsWithCurrent(items: LegalTypeDictionaryItem[], currentCode: string) {
  const active = activeItems(items);
  const current = items.find((item) => item.code === currentCode || item.name === currentCode);
  return current && !active.some((item) => item.id === current.id) ? [...active, current] : active;
}

function serializeDraft(draft: OrderDraft, lines: LineDraft[]) {
  return JSON.stringify({ draft, lines });
}

function SaveIndicator({ state, savedAt, onRetry }: { state: SaveState; savedAt: Date | null; onRetry: () => void }) {
  if (state === "saving") {
    return <span className="inline-flex items-center gap-1.5 text-sm text-muted"><Clock3 className="h-4 w-4" />Сохранение...</span>;
  }

  if (state === "error") {
    return <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700"><AlertCircle className="h-4 w-4" />Не удалось сохранить — повторить</button>;
  }

  if (state === "dirty") {
    return <span className="inline-flex items-center gap-1.5 text-sm text-warning"><AlertCircle className="h-4 w-4" />Есть несохранённые изменения</span>;
  }

  if (state === "saved" && savedAt) {
    return <span className="inline-flex items-center gap-1.5 text-sm text-muted"><CheckCircle2 className="h-4 w-4" />Сохранено в {savedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>;
  }

  return <span className="inline-flex items-center gap-1.5 text-sm text-muted"><CheckCircle2 className="h-4 w-4" />Изменений нет</span>;
}

export function OrderFormPage({
  mode,
  order,
  dictionaries
}: {
  mode: "create" | "edit";
  order?: Order;
  dictionaries: DictionariesState;
}) {
  const legalTypes = activeItems(dictionaries.legalTypes);
  const defaultLegalType = legalTypes[0]?.code ?? "ИП";
  const [draft, setDraft] = useState<OrderDraft>(() => order ? orderToDraft(order) : emptyOrderDraft(defaultLegalType));
  const [lineDrafts, setLineDrafts] = useState<LineDraft[]>(() => (order?.lines ?? []).map(lineToDraft));
  const [currentOrderId, setCurrentOrderId] = useState(order?.id ?? "");
  const [currentVersion, setCurrentVersion] = useState(order?.updatedAt ?? "");
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(order?.status ?? "draft");
  const [saveState, setSaveState] = useState<SaveState>("clean");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [serverError, setServerError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [customerOptions, setCustomerOptions] = useState<CustomerLookupItem[]>([]);
  const [newLineType, setNewLineType] = useState<SpecificationLineType>("product");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [deletedLine, setDeletedLine] = useState<{ lines: LineDraft[]; index: number } | null>(null);
  const [pastePreview, setPastePreview] = useState<PastePreview | null>(null);
  const [conflict, setConflict] = useState<Order | null>(null);
  const [storedDraft, setStoredDraft] = useState<{ draft: OrderDraft; lines: LineDraft[] } | null>(null);
  const savedSnapshot = useRef(serializeDraft(draft, lineDrafts));
  const latestSnapshot = useRef(savedSnapshot.current);
  const saveRef = useRef<(intent?: "manual" | "auto" | "confirm") => Promise<void>>(async () => undefined);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readOnly = currentStatus === "closed" || currentStatus === "cancelled";
  const storageKey = `luxerp-order-draft:${currentOrderId || mode}`;
  const orderedLineDrafts = useMemo(() => linesInGroupOrder(lineDrafts), [lineDrafts]);
  const computedLines = useMemo(() => orderedLineDrafts.map(draftToLine), [orderedLineDrafts]);
  const totals = useMemo(
    () => calculateOrderTotals(computedLines, order?.payments ?? []),
    [computedLines, order?.payments]
  );
  const groups = useMemo(
    () => orderedLineDrafts.filter((line) => line.lineType === "group"),
    [orderedLineDrafts]
  );
  const nextStatus = getQrStatusChoices(currentStatus)[0];

  latestSnapshot.current = serializeDraft(draft, lineDrafts);

  const updateDraft = useCallback(<K extends keyof OrderDraft>(key: K, value: OrderDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: "" }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      const params = new URLSearchParams();
      if (draft.customerName.trim()) params.set("query", draft.customerName.trim());

      try {
        const response = await fetch(`/api/customers?${params.toString()}`, { credentials: "same-origin" });
        const body = response.ok ? (await response.json()) as { data?: CustomerLookupItem[] } : {};
        if (!cancelled) setCustomerOptions(body.data ?? []);
      } catch {
        if (!cancelled) setCustomerOptions([]);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft.customerName]);

  useEffect(() => {
    const stored = sessionStorage.getItem(storageKey);
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as { draft: OrderDraft; lines: LineDraft[]; savedAt: string };
      if (serializeDraft(parsed.draft, parsed.lines) !== savedSnapshot.current) {
        setStoredDraft({ draft: parsed.draft, lines: parsed.lines });
      }
    } catch {
      sessionStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    const snapshot = serializeDraft(draft, lineDrafts);
    if (snapshot === savedSnapshot.current) return;

    setSaveState((state) => state === "saving" ? state : "dirty");
    sessionStorage.setItem(storageKey, JSON.stringify({ draft, lines: lineDrafts, savedAt: new Date().toISOString() }));
  }, [draft, lineDrafts, storageKey]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (saveState !== "dirty" && saveState !== "error") return;
      event.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saveState]);

  useEffect(() => {
    const handleSaveShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      void saveRef.current("manual");
    };

    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, []);

  useEffect(() => {
    if (!currentOrderId || currentStatus !== "draft" || saveState !== "dirty" || readOnly) return;
    const timer = setTimeout(() => void saveRef.current("auto"), 1000);
    return () => clearTimeout(timer);
  }, [currentOrderId, currentStatus, readOnly, saveState, draft, lineDrafts]);

  function validate(silent = false) {
    const errors: Record<string, string> = {};
    if (!draft.specificationNumber.trim()) errors.specificationNumber = "Укажите номер";
    if (!draft.documentDate) errors.documentDate = "Укажите дату";
    if (!draft.customerName.trim()) errors.customerName = "Выберите заказчика";
    if (!draft.customerLegalType) errors.customerLegalType = "Укажите тип клиента";
    if (draft.productionStartedAt && draft.productionStartedAt < draft.documentDate) errors.productionStartedAt = "Дата раньше даты оформления";
    if (draft.readyAt && draft.readyAt < draft.documentDate) errors.readyAt = "Дата раньше даты оформления";
    if (draft.deliveryRequired && !draft.deliveryAddress.trim()) errors.deliveryAddress = "Укажите адрес доставки";

    for (const line of lineDrafts) {
      if (line.lineType === "group" && !(line.title || line.description)?.trim()) errors[`line:${line.id}:description`] = "Укажите название группы";
      if (line.lineType === "product") {
        if (!line.description?.trim()) errors[`line:${line.id}:description`] = "Укажите описание";
        if (!(numberOf(line.heightMm) ?? 0)) errors[`line:${line.id}:heightMm`] = "Высота должна быть больше 0";
        if (!(numberOf(line.widthMm) ?? 0)) errors[`line:${line.id}:widthMm`] = "Ширина должна быть больше 0";
        if (!(numberOf(line.quantity) ?? 0)) errors[`line:${line.id}:quantity`] = "Количество должно быть больше 0";
      }
      if (line.lineType === "service" && !line.description?.trim()) errors[`line:${line.id}:description`] = "Укажите описание";
    }

    if (!silent) setFieldErrors(errors);
    return errors;
  }

  function payload(statusAction?: QrStatusChoice) {
    return {
      specificationNumber: draft.specificationNumber.trim(),
      documentDate: draft.documentDate,
      customerId: draft.customerId || undefined,
      customerName: draft.customerName.trim(),
      customerLegalType: draft.customerLegalType,
      status: currentStatus,
      statusAction,
      productionStartedAt: draft.productionStartedAt,
      readyAt: draft.readyAt,
      category: { name: draft.category },
      materialType: { name: draft.materialType },
      millingType: { name: draft.millingType },
      thicknessMm: draft.thicknessMm,
      colorCode: draft.colorCode,
      mainNote: draft.mainNote,
      jointingNote: draft.jointingNote,
      deliveryRequired: draft.deliveryRequired,
      deliveryAddress: draft.deliveryAddress,
      clientVersion: currentVersion || undefined,
      lines: computedLines.map((line, index) => ({
        ...line,
        orderId: undefined,
        sortOrder: (index + 1) * 10,
        unitAreaM2: undefined,
        totalAreaM2: undefined,
        totalPrice: undefined,
        isCalculated: undefined
      }))
    };
  }

  const save = useCallback(async (intent: "manual" | "auto" | "confirm" = "manual") => {
    if (readOnly || saveState === "saving") return;
    const errors = validate(intent === "auto");
    if (Object.keys(errors).length > 0) {
      if (intent !== "auto") {
        setServerError("Исправьте отмеченные поля перед сохранением");
        requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      }
      return;
    }

    if (intent === "confirm" && !computedLines.some((line) => line.isCalculated)) {
      setServerError("Для подтверждения добавьте хотя бы одну расчётную строку");
      return;
    }

    setSaveState("saving");
    setServerError("");
    const requestSnapshot = serializeDraft(draft, lineDrafts);
    const response = await fetch(currentOrderId ? `/api/orders/${currentOrderId}` : "/api/orders", {
      method: currentOrderId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload(intent === "confirm" ? nextStatus : undefined))
    });
    const body = await response.json().catch(() => null) as { data?: Order; error?: string; field?: string; code?: string } | null;

    if (!response.ok || !body?.data) {
      setSaveState("error");
      setServerError(body?.error ?? "Не удалось сохранить заказ");
      if (body?.field) setFieldErrors((current) => ({ ...current, [body.field!]: body.error ?? "Проверьте значение" }));
      if (body?.code === "VERSION_CONFLICT" && body.data) setConflict(body.data);
      return;
    }

    const savedOrder = body.data;
    const nextLines = savedOrder.lines.map(lineToDraft);
    const serverSnapshot = serializeDraft(draft, nextLines);
    const applyServerSnapshot = canApplySavedSnapshot(requestSnapshot, latestSnapshot.current);
    setCurrentOrderId(savedOrder.id);
    setCurrentVersion(savedOrder.updatedAt);
    setCurrentStatus(savedOrder.status);
    setSavedAt(new Date());
    setConflict(null);
    savedSnapshot.current = serverSnapshot;

    if (applyServerSnapshot) {
      setLineDrafts(nextLines);
      setSaveState("saved");
      sessionStorage.removeItem(storageKey);
    } else {
      setSaveState("dirty");
    }

    if (!currentOrderId) {
      window.history.replaceState(window.history.state, "", `/orders/${savedOrder.id}/edit`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedLines, currentOrderId, currentVersion, currentStatus, draft, lineDrafts, nextStatus, readOnly, saveState, storageKey]);

  saveRef.current = save;

  function updateLine(id: string, key: EditableLineField, value: string) {
    setLineDrafts((current) => current.map((line) => {
      if (line.id !== id) return line;
      if (key === "lineType") {
        const lineType = value as SpecificationLineType;
        return {
          ...line,
          lineType,
          parentId: lineType === "group" ? null : line.parentId,
          isCalculated: lineType === "product" || lineType === "service"
        };
      }
      return { ...line, [key]: value };
    }));
    setFieldErrors((current) => ({ ...current, [`line:${id}:${key}`]: "" }));
  }

  function addLine(type = newLineType, parentId?: string | null) {
    const lastGroup = [...lineDrafts].reverse().find((line) => line.lineType === "group");
    const line = newLine(type, (lineDrafts.length + 1) * 10, parentId === undefined ? lastGroup?.id ?? null : parentId);
    setLineDrafts((current) => normalizeLineOrder([...current, line]));
    requestAnimationFrame(() => {
      const firstField = type === "product" ? "heightMm" : "description";
      document.querySelector<HTMLElement>(`[data-cell='${line.id}:${firstField}']`)?.focus();
    });
    return line;
  }

  function removeLine(line: LineDraft) {
    const children = lineDrafts.filter((item) => item.parentId === line.id);
    if (children.length > 0 && !window.confirm(`Удалить группу и ${children.length} строк?`)) return;

    const index = lineDrafts.findIndex((item) => item.id === line.id);
    const removed = lineDrafts.filter((item) => item.id === line.id || item.parentId === line.id);
    setLineDrafts((current) => current.filter((item) => item.id !== line.id && item.parentId !== line.id));
    setDeletedLine({ lines: removed, index });
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
    deleteTimer.current = setTimeout(() => setDeletedLine(null), 5000);
  }

  function undoDelete() {
    if (!deletedLine) return;
    setLineDrafts((current) => {
      const next = [...current];
      next.splice(deletedLine.index, 0, ...deletedLine.lines);
      return next;
    });
    setDeletedLine(null);
    if (deleteTimer.current) clearTimeout(deleteTimer.current);
  }

  function moveLine(id: string, direction: -1 | 1) {
    setLineDrafts((current) => {
      const index = current.findIndex((line) => line.id === id);
      if (index < 0) return current;
      const moving = current[index];

      if (moving.lineType === "group") {
        const blocks: LineDraft[][] = [];
        const consumed = new Set<string>();
        current.forEach((line) => {
          if (consumed.has(line.id) || line.parentId) return;
          const block = line.lineType === "group"
            ? [line, ...current.filter((item) => item.parentId === line.id)]
            : [line];
          block.forEach((item) => consumed.add(item.id));
          blocks.push(block);
        });
        current.filter((line) => !consumed.has(line.id)).forEach((line) => blocks.push([line]));
        const blockIndex = blocks.findIndex((block) => block[0]?.id === id);
        const targetBlock = blockIndex + direction;
        if (blockIndex < 0 || targetBlock < 0 || targetBlock >= blocks.length) return current;
        [blocks[blockIndex], blocks[targetBlock]] = [blocks[targetBlock], blocks[blockIndex]];
        return blocks.flat().map((line, lineIndex) => ({ ...line, sortOrder: (lineIndex + 1) * 10 }));
      }

      const siblings = current.filter((line) => line.lineType !== "group" && line.parentId === moving.parentId);
      const siblingIndex = siblings.findIndex((line) => line.id === id);
      const targetSibling = siblings[siblingIndex + direction];
      if (!targetSibling) return current;
      const target = current.findIndex((line) => line.id === targetSibling.id);
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((line, lineIndex) => ({ ...line, sortOrder: (lineIndex + 1) * 10 }));
    });
  }

  function focusVertical(lineId: string, field: EditableLineField, direction: -1 | 1) {
    const index = orderedLineDrafts.findIndex((line) => line.id === lineId);
    const target = orderedLineDrafts[index + direction];
    if (target) document.querySelector<HTMLElement>(`[data-cell='${target.id}:${field}']`)?.focus();
  }

  function handleCellKeyDown(event: KeyboardEvent<HTMLElement>, line: LineDraft, field: EditableLineField) {
    if (event.key === "Escape") {
      event.currentTarget.blur();
      return;
    }
    if (event.key === "Enter" && !event.ctrlKey) {
      event.preventDefault();
      focusVertical(line.id, field, event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      const cells = [...document.querySelectorAll<HTMLElement>("[data-cell]")].filter((cell) => cell.tabIndex !== -1 && !cell.hasAttribute("disabled"));
      if (cells.at(-1) === event.currentTarget) {
        event.preventDefault();
        addLine("product", line.parentId);
      }
    }
  }

  function getPasteMapping(rows: string[][], startField: EditableLineField) {
    const headerMapping = rows[0]?.map((value) => headerFields.get(value.trim().toLowerCase()) ?? null);
    const hasHeaders = (headerMapping?.filter(Boolean).length ?? 0) >= 2;
    const startIndex = pasteFields.indexOf(startField);
    return {
      fields: hasHeaders ? headerMapping : pasteFields.slice(Math.max(0, startIndex)),
      rows: hasHeaders ? rows.slice(1) : rows
    };
  }

  function validatePaste(rows: string[][], startField: EditableLineField) {
    const errors: string[] = [];
    const mapping = getPasteMapping(rows, startField);
    mapping.rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      const field = mapping.fields[columnIndex];
      if (field === "lineType" && value && !lineTypeFromText(value)) errors.push(`Строка ${rowIndex + 1}: неизвестный тип «${value}»`);
      if (field && ["heightMm", "widthMm", "quantity", "pricePerM2", "unitPrice"].includes(field) && value && numberOf(value) === undefined) errors.push(`Строка ${rowIndex + 1}, столбец ${columnIndex + 1}: требуется число`);
    }));
    return errors;
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>, line: LineDraft, field: EditableLineField) {
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n") && !text.includes("\r")) return;
    event.preventDefault();
    const rows = parseTsv(text);
    setPastePreview({ rows, startLineId: line.id, startField: field, errors: validatePaste(rows, field) });
  }

  function applyPaste() {
    if (!pastePreview || pastePreview.errors.length > 0) return;
    const { rows, fields } = getPasteMapping(pastePreview.rows, pastePreview.startField);

    setLineDrafts((current) => {
      const next = linesInGroupOrder(current);
      const startIndex = next.findIndex((line) => line.id === pastePreview.startLineId);
      const parentId = next[startIndex]?.parentId ?? null;
      rows.forEach((row, rowOffset) => {
        const targetIndex = startIndex + rowOffset;
        const target = next[targetIndex] ?? newLine("product", (targetIndex + 1) * 10, parentId);
        let updated = { ...target };
        row.forEach((value, columnIndex) => {
          const field = fields[columnIndex];
          if (!field) return;
          if (field === "lineType") {
            const lineType = lineTypeFromText(value);
            if (lineType) updated = { ...updated, lineType, isCalculated: lineType === "product" || lineType === "service" };
          } else {
            updated = { ...updated, [field]: value };
          }
        });
        next[targetIndex] = updated;
      });
      return normalizeLineOrder(next);
    });
    setPastePreview(null);
  }

  const visibleLines = orderedLineDrafts.filter(
    (line) => !line.parentId || !collapsedGroups.has(line.parentId)
  );

  return (
    <div className="mx-auto max-w-[1440px] pb-24">
      <header className="sticky top-[164px] z-20 border-b border-line bg-white/95 px-3 py-2 shadow-soft backdrop-blur sm:top-[121px] sm:px-4 sm:py-3 xl:top-[73px]">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <Link href={currentOrderId ? `/orders/${currentOrderId}` : "/orders"} className="hidden items-center gap-1 text-xs text-muted hover:text-ink sm:inline-flex">
              <ChevronLeft className="h-3.5 w-3.5" /> Заказы / {currentOrderId ? `№${draft.specificationNumber}` : "Новый заказ"}
            </Link>
            <div className="flex flex-wrap items-center gap-2 sm:mt-1">
              <h1 className="text-base font-semibold text-ink sm:text-xl">{currentOrderId ? `Заказ ${draft.specificationNumber}` : "Новый заказ"}</h1>
              <StatusBadge status={currentStatus} />
              {draft.customerName ? <span className="hidden truncate text-sm text-muted md:inline">{draft.customerName}</span> : null}
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:flex-wrap sm:justify-end">
            <SaveIndicator state={saveState} savedAt={savedAt} onRetry={() => void save("manual")} />
            {currentOrderId ? <span className="hidden sm:inline-flex"><IconLink href={`/api/orders/${currentOrderId}/print`} label="Печать"><Printer className="h-4 w-4" /></IconLink></span> : null}
            {currentOrderId ? <span className="hidden sm:inline-flex"><IconLink href={`/api/orders/${currentOrderId}/xlsx`} label="Экспорт Excel"><FileSpreadsheet className="h-4 w-4" /></IconLink></span> : null}
            <button type="button" onClick={() => void save("manual")} aria-label={currentOrderId ? "Сохранить" : "Сохранить черновик"} title={currentOrderId ? "Сохранить" : "Сохранить черновик"} disabled={readOnly || saveState === "saving"} className="inline-flex h-9 w-9 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-white disabled:opacity-50 sm:w-auto sm:px-3"><Save className="h-4 w-4" /><span className="hidden sm:inline">{currentOrderId ? "Сохранить" : "Сохранить черновик"}</span></button>
          </div>
        </div>
        {serverError ? <p role="alert" className="mt-2 text-sm text-red-700">{serverError}</p> : null}
      </header>

      <div className="space-y-6 px-4 py-5 md:px-6">
        {storedDraft ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border border-warning/40 bg-amber-50 px-4 py-3 text-sm">
            <span>Найден локальный черновик с несохранёнными изменениями.</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setDraft(storedDraft.draft); setLineDrafts(storedDraft.lines); setStoredDraft(null); }} className="rounded-md bg-ink px-3 py-1.5 text-white">Восстановить</button>
              <button type="button" onClick={() => { sessionStorage.removeItem(storageKey); setStoredDraft(null); }} className="rounded-md border border-line bg-white px-3 py-1.5">Удалить черновик</button>
            </div>
          </div>
        ) : null}

        {conflict ? (
          <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            <p className="font-medium">Заказ изменён другим пользователем</p>
            <p className="mt-1">Серверная версия: {new Date(conflict.updatedAt).toLocaleString("ru-RU")}; строк: {conflict.lines.length}. Ваши изменения сохранены локально.</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => window.location.reload()} className="rounded-md border border-red-300 bg-white px-3 py-1.5">Загрузить изменения</button>
              <button type="button" onClick={() => { setCurrentVersion(conflict.updatedAt); setConflict(null); setSaveState("dirty"); }} className="rounded-md bg-red-800 px-3 py-1.5 text-white">Оставить мои</button>
            </div>
          </div>
        ) : null}

        <section aria-labelledby="order-details-heading">
          <h2 id="order-details-heading" className="text-base font-semibold text-ink">Реквизиты заказа и заказчик</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <Field label="Номер спецификации" error={fieldErrors.specificationNumber} className="xl:col-span-3">
              <input value={draft.specificationNumber} onChange={(event) => updateDraft("specificationNumber", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.specificationNumber)} aria-describedby="specificationNumber-error" className="order-input" />
            </Field>
            <Field label="Дата оформления" error={fieldErrors.documentDate} className="xl:col-span-3">
              <input type="date" value={draft.documentDate} onChange={(event) => updateDraft("documentDate", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.documentDate)} aria-describedby="documentDate-error" className="order-input" />
            </Field>
            <Field label="Заказчик" error={fieldErrors.customerName} className="xl:col-span-4">
              <input list="customer-options" value={draft.customerName} onChange={(event) => {
                const customer = customerOptions.find((item) => item.name.toLowerCase() === event.target.value.trim().toLowerCase());
                setDraft((current) => ({ ...current, customerName: event.target.value, customerId: customer?.id ?? "", customerLegalType: customer?.legalType ?? current.customerLegalType }));
                setFieldErrors((current) => ({ ...current, customerName: "" }));
              }} disabled={readOnly} aria-invalid={Boolean(fieldErrors.customerName)} aria-describedby="customerName-error" className="order-input" />
              <datalist id="customer-options">{customerOptions.map((item) => <option key={item.id} value={item.name}>{item.legalType}</option>)}</datalist>
            </Field>
            <Field label="Тип клиента" error={fieldErrors.customerLegalType} className="xl:col-span-2">
              <select value={draft.customerLegalType} onChange={(event) => updateDraft("customerLegalType", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.customerLegalType)} className="order-input">
                {legalOptionsWithCurrent(dictionaries.legalTypes, draft.customerLegalType).map((item) => <option key={item.id} value={item.code}>{item.name}{item.isActive ? "" : " (неактивно)"}</option>)}
              </select>
            </Field>
            <Field label="Основной комментарий" className="md:col-span-2 xl:col-span-12">
              <textarea rows={2} value={draft.mainNote} onChange={(event) => updateDraft("mainNote", event.target.value)} disabled={readOnly} className="order-input" />
            </Field>
          </div>
        </section>

        <section aria-labelledby="dates-heading" className="border-t border-line pt-5">
          <h2 id="dates-heading" className="text-base font-semibold text-ink">Сроки и доставка</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <Field label="В производство" error={fieldErrors.productionStartedAt} className="xl:col-span-3">
              <input type="date" value={draft.productionStartedAt} onChange={(event) => updateDraft("productionStartedAt", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.productionStartedAt)} className="order-input" />
            </Field>
            <Field label="Плановая готовность" error={fieldErrors.readyAt} className="xl:col-span-3">
              <input type="date" value={draft.readyAt} onChange={(event) => updateDraft("readyAt", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.readyAt)} className="order-input" />
            </Field>
            <label className="flex min-h-10 items-center gap-3 xl:col-span-3 xl:mt-6">
              <input type="checkbox" checked={draft.deliveryRequired} onChange={(event) => updateDraft("deliveryRequired", event.target.checked)} disabled={readOnly} className="h-4 w-4 rounded border-line text-accent focus:ring-accent" />
              <span className="text-sm font-medium text-ink">Нужна доставка</span>
            </label>
            {draft.deliveryRequired ? <Field label="Адрес доставки" error={fieldErrors.deliveryAddress} className="md:col-span-2 xl:col-span-12"><textarea rows={2} value={draft.deliveryAddress} onChange={(event) => updateDraft("deliveryAddress", event.target.value)} disabled={readOnly} aria-invalid={Boolean(fieldErrors.deliveryAddress)} className="order-input" /></Field> : null}
          </div>
        </section>

        <section aria-labelledby="product-heading" className="border-t border-line pt-5">
          <h2 id="product-heading" className="text-base font-semibold text-ink">Параметры изделия</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <SelectField label="Категория" value={draft.category} onChange={(value) => updateDraft("category", value)} items={optionsWithCurrent(dictionaries.productCategories, draft.category)} disabled={readOnly} className="xl:col-span-3" />
            <SelectField label="Материал" value={draft.materialType} onChange={(value) => updateDraft("materialType", value)} items={optionsWithCurrent(dictionaries.materialTypes, draft.materialType)} disabled={readOnly} className="xl:col-span-3" />
            <Field label="Фрезеровка" className="xl:col-span-3"><input list="milling-options" value={draft.millingType} onChange={(event) => updateDraft("millingType", event.target.value)} disabled={readOnly} className="order-input" /><datalist id="milling-options">{optionsWithCurrent(dictionaries.millingTypes, draft.millingType).map((item) => <option key={item.id} value={item.name} />)}</datalist></Field>
            <SelectField label="Толщина, мм" value={draft.thicknessMm} onChange={(value) => updateDraft("thicknessMm", value)} items={optionsWithCurrent(dictionaries.thicknesses, draft.thicknessMm)} disabled={readOnly} className="xl:col-span-3" />
            <Field label="Цвет / код" className="xl:col-span-3"><input value={draft.colorCode} onChange={(event) => updateDraft("colorCode", event.target.value)} disabled={readOnly} className="order-input" /></Field>
            <Field label="Стыковка" className="xl:col-span-9"><input value={draft.jointingNote} onChange={(event) => updateDraft("jointingNote", event.target.value)} disabled={readOnly} className="order-input" /></Field>
          </div>
        </section>

        <section aria-labelledby="lines-heading" className="border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><h2 id="lines-heading" className="text-base font-semibold text-ink">Табличная часть</h2><p className="mt-0.5 text-sm text-muted">Расчётные значения обновляются сразу.</p></div>
            {!readOnly ? <div className="flex items-center gap-2"><select value={newLineType} onChange={(event) => setNewLineType(event.target.value as SpecificationLineType)} className="h-9 rounded-md border-line py-1 pl-2 pr-8 text-sm">{editableLineTypes.map((type) => <option key={type} value={type}>{lineTypeLabels[type]}</option>)}</select><button type="button" onClick={() => addLine()} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-3 text-sm font-medium text-white"><Plus className="h-4 w-4" />Добавить строку</button></div> : null}
          </div>

          {pastePreview ? <PastePanel preview={pastePreview} onCancel={() => setPastePreview(null)} onApply={applyPaste} /> : null}

          <div className="mt-3 overflow-x-auto border border-line bg-white shadow-soft [scrollbar-color:#657084_#eef1f5]" aria-label="Таблица строк спецификации">
            <table className="w-full min-w-[1510px] table-fixed text-[13px]">
              <thead className="sticky top-0 z-10 h-10 bg-panel text-left text-xs text-muted">
                <tr><TableHead className="w-[128px] bg-panel lg:sticky lg:left-0 lg:z-20">Тип строки</TableHead><TableHead numeric className="w-[92px]">Высота, мм</TableHead><TableHead numeric className="w-[92px]">Ширина, мм</TableHead><TableHead numeric className="w-[100px] bg-panel lg:sticky lg:left-[128px] lg:z-20">Количество</TableHead><TableHead className="w-[82px]">Ед.</TableHead><TableHead className="w-[270px] bg-panel lg:sticky lg:left-[228px] lg:z-20">Описание</TableHead><TableHead numeric className="w-[118px]">Цена за м²</TableHead><TableHead numeric className="w-[112px]">Площадь 1 ед.</TableHead><TableHead numeric className="w-[120px]">Общая площадь</TableHead><TableHead numeric className="w-[118px]">Цена за ед.</TableHead><TableHead numeric className="w-[122px] bg-panel lg:sticky lg:right-[172px] lg:z-20">Сумма</TableHead><TableHead className="w-[172px] bg-panel lg:sticky lg:right-0 lg:z-20">Действия</TableHead></tr>
              </thead>
              <tbody>
                {visibleLines.map((line) => line.lineType === "group" ? (
                  <GroupRow key={line.id} line={line} allLines={computedLines} collapsed={collapsedGroups.has(line.id)} readOnly={readOnly} error={fieldErrors[`line:${line.id}:description`]} onToggle={() => setCollapsedGroups((current) => { const next = new Set(current); if (next.has(line.id)) next.delete(line.id); else next.add(line.id); return next; })} onChange={(value) => setLineDrafts((current) => current.map((item) => item.id === line.id ? { ...item, title: value } : item))} onAdd={() => addLine("product", line.id)} onMove={(direction) => moveLine(line.id, direction)} onDelete={() => removeLine(line)} />
                ) : (
                  <LineRow key={line.id} line={line} computed={computedLines.find((item) => item.id === line.id)!} groups={groups} readOnly={readOnly} errors={fieldErrors} onChange={(field, value) => updateLine(line.id, field, value)} onParentChange={(parentId) => setLineDrafts((current) => normalizeLineOrder(current.map((item) => item.id === line.id ? { ...item, parentId: parentId || null } : item)))} onKeyDown={(event, field) => handleCellKeyDown(event, line, field)} onPaste={(event, field) => handlePaste(event, line, field)} onMove={(direction) => moveLine(line.id, direction)} onDelete={() => removeLine(line)} />
                ))}
                {lineDrafts.length === 0 ? <tr><td colSpan={12} className="h-24 text-center text-sm text-muted">Добавьте группу или строку спецификации</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="totals-heading" className="border-t border-line pt-5">
          <h2 id="totals-heading" className="text-base font-semibold text-ink">Итоги заказа</h2>
          <dl className="mt-3 grid grid-cols-2 border-y border-line bg-white md:grid-cols-4 xl:grid-cols-7">
            <Total label="Площадь" value={`${formatArea(totals.totalAreaM2)} м²`} />
            <Total label="До корректировок" value={formatMoney(totals.subtotalAmount)} />
            <Total label="Скидка" value={formatMoney(totals.discountAmount)} />
            <Total label="Наценка" value={formatMoney(totals.surchargeAmount)} />
            <Total label="Итого" value={formatMoney(totals.totalAmount)} strong />
            <Total label="Оплачено" value={formatMoney(totals.prepaymentAmount)} />
            <Total label="Остаток" value={formatMoney(totals.balanceAmount)} strong />
          </dl>
        </section>

        {currentOrderId && order ? <PaymentsSection orderId={currentOrderId} payments={order.payments} canManage={!readOnly} /> : null}

        {order?.statusHistory.length ? <details className="border-t border-line pt-4"><summary className="cursor-pointer text-sm font-medium text-ink">История статусов ({order.statusHistory.length})</summary><ol className="mt-3 space-y-2 text-sm">{[...order.statusHistory].reverse().map((item) => <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2"><span>{orderStatusLabels[item.status]}{item.comment ? ` — ${item.comment}` : ""}</span><time className="text-muted">{new Date(item.changedAt).toLocaleString("ru-RU")}</time></li>)}</ol></details> : null}
      </div>

      {!readOnly ? <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 shadow-[0_-2px_8px_rgba(29,36,51,0.08)] backdrop-blur md:static md:mx-6 md:mt-4 md:flex md:items-center md:justify-between md:rounded-md md:border">
        <SaveIndicator state={saveState} savedAt={savedAt} onRetry={() => void save("manual")} />
        <div className="mt-2 flex flex-wrap items-center justify-end gap-2 md:mt-0">
          <Link href={currentOrderId ? `/orders/${currentOrderId}` : "/orders"} className="rounded-md border border-line bg-white px-3 py-2 text-sm">Отмена</Link>
          {currentOrderId && nextStatus ? <button type="button" onClick={() => void save("confirm")} disabled={saveState === "saving"} className="rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent">Сохранить и {nextStatus === "confirmed" ? "подтвердить" : `перевести: ${orderStatusLabels[nextStatus].toLowerCase()}`}</button> : null}
          <button type="button" onClick={() => void save("manual")} disabled={saveState === "saving"} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"><Save className="h-4 w-4" />Сохранить</button>
          <details className="relative"><summary aria-label="Ещё" title="Ещё" className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-md border border-line"><MoreHorizontal className="h-4 w-4" /></summary><div className="absolute bottom-11 right-0 w-44 border border-line bg-white p-1 shadow-lg">{currentOrderId ? <><a href={`/api/orders/${currentOrderId}/print`} className="block px-3 py-2 text-sm hover:bg-panel">Печать</a><a href={`/api/orders/${currentOrderId}/xlsx`} className="block px-3 py-2 text-sm hover:bg-panel">Экспорт Excel</a></> : <span className="block px-3 py-2 text-sm text-muted">Действий пока нет</span>}</div></details>
        </div>
      </div> : null}

      {deletedLine ? <div role="status" className="fixed bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-md bg-ink px-4 py-3 text-sm text-white shadow-lg"><span>Строка удалена</span><button type="button" onClick={undoDelete} className="inline-flex items-center gap-1 font-medium underline"><RotateCcw className="h-4 w-4" />Отменить</button></div> : null}
    </div>
  );
}

function Field({ label, error, className = "", children }: { label: string; error?: string; className?: string; children: ReactNode }) {
  const id = `${label.replaceAll(" ", "-")}-error`;
  return <label className={`space-y-1 ${className}`}><span className="text-xs font-medium text-muted">{label}</span>{children}{error ? <span id={id} className="block text-xs text-red-700">{error}</span> : null}</label>;
}

function SelectField({ label, value, onChange, items, disabled, className }: { label: string; value: string; onChange: (value: string) => void; items: DictionaryItem[]; disabled: boolean; className: string }) {
  return <Field label={label} className={className}><select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="order-input"><option value="">Не указано</option>{items.map((item) => <option key={item.id} value={item.name}>{item.name}{item.isActive ? "" : " (неактивно)"}</option>)}</select></Field>;
}

function TableHead({ children, numeric, className = "" }: { children: ReactNode; numeric?: boolean; className?: string }) {
  return <th scope="col" className={`h-10 border-b border-line px-2 font-medium ${numeric ? "text-right" : "text-left"} ${className}`}>{children}</th>;
}

function CellInput({ line, field, value, disabled, error, numeric, onChange, onKeyDown, onPaste, className = "" }: { line: LineDraft; field: EditableLineField; value: string; disabled?: boolean; error?: string; numeric?: boolean; onChange: (value: string) => void; onKeyDown: (event: KeyboardEvent<HTMLElement>, field: EditableLineField) => void; onPaste: (event: ClipboardEvent<HTMLElement>, field: EditableLineField) => void; className?: string }) {
  return <input data-cell={`${line.id}:${field}`} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => onKeyDown(event, field)} onPaste={(event) => onPaste(event, field)} disabled={disabled} tabIndex={disabled ? -1 : 0} inputMode={numeric ? "decimal" : undefined} aria-invalid={Boolean(error)} title={error} className={`h-9 w-full border-0 bg-transparent px-2 text-[13px] outline-none focus:ring-2 focus:ring-inset focus:ring-accent disabled:bg-panel disabled:text-muted ${numeric ? "text-right" : "text-left"} ${error ? "bg-red-50 ring-1 ring-inset ring-red-500" : ""} ${className}`} />;
}

function LineRow({ line, computed, groups, readOnly, errors, onChange, onParentChange, onKeyDown, onPaste, onMove, onDelete }: { line: LineDraft; computed: SpecificationLine; groups: LineDraft[]; readOnly: boolean; errors: Record<string, string>; onChange: (field: EditableLineField, value: string) => void; onParentChange: (parentId: string) => void; onKeyDown: (event: KeyboardEvent<HTMLElement>, field: EditableLineField) => void; onPaste: (event: ClipboardEvent<HTMLElement>, field: EditableLineField) => void; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  const product = line.lineType === "product";
  const service = line.lineType === "service";
  const descriptive = product || service || line.lineType === "comment";
  const error = (field: EditableLineField) => errors[`line:${line.id}:${field}`];
  return <tr className="h-9 border-b border-line bg-white last:border-0">
    <td className="bg-white p-0 lg:sticky lg:left-0 lg:z-[5]"><select data-cell={`${line.id}:lineType`} value={line.lineType} onChange={(event) => onChange("lineType", event.target.value)} onKeyDown={(event) => onKeyDown(event, "lineType")} disabled={readOnly} className="h-9 w-full border-0 bg-transparent px-2 py-0 text-xs outline-none focus:ring-2 focus:ring-inset focus:ring-accent">{editableLineTypes.filter((type) => type !== "group").map((type) => <option key={type} value={type}>{lineTypeLabels[type]}</option>)}</select></td>
    <td className="p-0"><CellInput line={line} field="heightMm" value={line.heightMm} disabled={readOnly || !product} error={error("heightMm")} numeric onChange={(value) => onChange("heightMm", value)} onKeyDown={onKeyDown} onPaste={onPaste} /></td>
    <td className="p-0"><CellInput line={line} field="widthMm" value={line.widthMm} disabled={readOnly || !product} error={error("widthMm")} numeric onChange={(value) => onChange("widthMm", value)} onKeyDown={onKeyDown} onPaste={onPaste} /></td>
    <td className="bg-white p-0 lg:sticky lg:left-[128px] lg:z-[5]"><CellInput line={line} field="quantity" value={line.quantity} disabled={readOnly || !(product || service)} error={error("quantity")} numeric onChange={(value) => onChange("quantity", value)} onKeyDown={onKeyDown} onPaste={onPaste} /></td>
    <td className="p-0"><CellInput line={line} field="unit" value={valueOf(line.unit)} disabled={readOnly || !(product || service)} onChange={(value) => onChange("unit", value)} onKeyDown={onKeyDown} onPaste={onPaste} /></td>
    <td className="bg-white p-0 lg:sticky lg:left-[228px] lg:z-[5]"><CellInput line={line} field="description" value={valueOf(line.description)} disabled={readOnly || !descriptive} error={error("description")} onChange={(value) => onChange("description", value)} onKeyDown={onKeyDown} onPaste={onPaste} /></td>
    <td className="p-0"><CellInput line={line} field="pricePerM2" value={line.pricePerM2} disabled={readOnly || !product} numeric onChange={(value) => onChange("pricePerM2", value)} onKeyDown={onKeyDown} onPaste={onPaste} /></td>
    <td className="bg-panel px-2 text-right text-muted">{product ? formatArea(computed.unitAreaM2 ?? 0) : ""}</td>
    <td className="bg-panel px-2 text-right text-muted">{product ? formatArea(computed.totalAreaM2 ?? 0) : ""}</td>
    <td className="p-0">{service ? <CellInput line={line} field="unitPrice" value={line.unitPrice} disabled={readOnly} numeric onChange={(value) => onChange("unitPrice", value)} onKeyDown={onKeyDown} onPaste={onPaste} /> : <div className="h-9 bg-panel px-2 py-2 text-right text-muted">{product ? formatMoney(computed.unitPrice ?? 0) : ""}</div>}</td>
    <td className="bg-panel px-2 text-right font-medium lg:sticky lg:right-[172px] lg:z-[5]">{product || service ? formatMoney(computed.totalPrice ?? 0) : ""}</td>
    <td className="bg-white px-1 lg:sticky lg:right-0 lg:z-[5]"><div className="flex items-center justify-end gap-1"><select aria-label="Группа строки" title="Переместить в группу" value={line.parentId ?? ""} onChange={(event) => onParentChange(event.target.value)} disabled={readOnly} className="h-7 w-[76px] rounded border-line py-0 pl-1 pr-5 text-[11px]"><option value="">Без группы</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.title || "Группа"}</option>)}</select><SmallButton label="Переместить выше" onClick={() => onMove(-1)} disabled={readOnly}><ArrowUp className="h-3.5 w-3.5" /></SmallButton><SmallButton label="Переместить ниже" onClick={() => onMove(1)} disabled={readOnly}><ArrowDown className="h-3.5 w-3.5" /></SmallButton><SmallButton label="Удалить строку" onClick={onDelete} disabled={readOnly} danger><Trash2 className="h-3.5 w-3.5" /></SmallButton></div></td>
  </tr>;
}

function GroupRow({ line, allLines, collapsed, readOnly, error, onToggle, onChange, onAdd, onMove, onDelete }: { line: LineDraft; allLines: SpecificationLine[]; collapsed: boolean; readOnly: boolean; error?: string; onToggle: () => void; onChange: (value: string) => void; onAdd: () => void; onMove: (direction: -1 | 1) => void; onDelete: () => void }) {
  const totals = calculateGroupTotals(allLines, line.id);
  return <tr className="h-10 border-b border-line bg-[#eef7f6]">
    <td className="bg-[#eef7f6] px-2 font-medium lg:sticky lg:left-0 lg:z-[6]"><button type="button" onClick={onToggle} className="inline-flex items-center gap-1" aria-label={collapsed ? "Развернуть группу" : "Свернуть группу"}><ChevronRight className={`h-4 w-4 transition ${collapsed ? "" : "rotate-90"}`} />Группа</button></td>
    <td colSpan={4} className="bg-[#eef7f6]" />
    <td className="bg-[#eef7f6] p-0 lg:sticky lg:left-[228px] lg:z-[6]"><input data-cell={`${line.id}:description`} value={line.title ?? ""} onChange={(event) => onChange(event.target.value)} disabled={readOnly} aria-invalid={Boolean(error)} title={error} className={`h-10 w-full border-0 bg-transparent px-2 font-semibold outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${error ? "ring-1 ring-inset ring-red-500" : ""}`} /></td>
    <td colSpan={2} className="bg-[#eef7f6]" />
    <td className="bg-[#eef7f6] px-2 text-right text-muted">{formatArea(totals.area)} м²</td>
    <td className="bg-[#eef7f6]" />
    <td className="bg-[#eef7f6] px-2 text-right font-semibold lg:sticky lg:right-[172px] lg:z-[6]">{formatMoney(totals.amount)}</td>
    <td className="bg-[#eef7f6] px-1 lg:sticky lg:right-0 lg:z-[6]"><div className="flex justify-end gap-1"><SmallButton label="Добавить товар в группу" onClick={onAdd} disabled={readOnly}><Plus className="h-3.5 w-3.5" /></SmallButton><SmallButton label="Переместить выше" onClick={() => onMove(-1)} disabled={readOnly}><ArrowUp className="h-3.5 w-3.5" /></SmallButton><SmallButton label="Переместить ниже" onClick={() => onMove(1)} disabled={readOnly}><ArrowDown className="h-3.5 w-3.5" /></SmallButton><SmallButton label="Удалить группу" onClick={onDelete} disabled={readOnly} danger><Trash2 className="h-3.5 w-3.5" /></SmallButton></div></td>
  </tr>;
}

function SmallButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled} className={`inline-flex h-7 w-7 items-center justify-center rounded border bg-white disabled:opacity-40 ${danger ? "border-red-200 text-red-700" : "border-line text-ink"}`}>{children}</button>;
}

function PastePanel({ preview, onCancel, onApply }: { preview: PastePreview; onCancel: () => void; onApply: () => void }) {
  return <div className="mt-3 border border-line bg-panel p-3 text-sm" onKeyDown={(event) => { if (event.ctrlKey && event.key === "Enter" && preview.errors.length === 0) onApply(); }} tabIndex={0}>
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium text-ink">Предпросмотр вставки: {preview.rows.length} строк, {Math.max(...preview.rows.map((row) => row.length), 0)} столбцов</p>{preview.errors.length ? <ul className="mt-1 text-red-700">{preview.errors.slice(0, 4).map((error) => <li key={error}>{error}</li>)}</ul> : <p className="mt-1 text-muted">Структура распознана. Проверьте данные перед вставкой.</p>}</div><div className="flex gap-2"><button type="button" onClick={onCancel} className="rounded-md border border-line bg-white px-3 py-1.5">Отмена</button><button type="button" onClick={onApply} disabled={preview.errors.length > 0} className="rounded-md bg-ink px-3 py-1.5 text-white disabled:opacity-40">Вставить</button></div></div>
    <div className="mt-2 max-h-32 overflow-auto"><table className="border-collapse text-xs"><tbody>{preview.rows.slice(0, 5).map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="max-w-48 truncate border border-line bg-white px-2 py-1">{cell || " "}</td>)}</tr>)}</tbody></table></div>
  </div>;
}

function Total({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return <div className="border-b border-r border-line px-3 py-3 last:border-r-0 md:border-b-0"><dt className="text-xs text-muted">{label}</dt><dd className={`mt-1 text-sm text-ink ${strong ? "font-semibold" : "font-medium"}`}>{value}</dd></div>;
}

function IconLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return <a href={href} aria-label={label} title={label} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line bg-white text-ink hover:border-accent hover:text-accent">{children}</a>;
}
