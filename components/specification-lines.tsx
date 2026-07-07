"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Plus, Trash2 } from "lucide-react";
import type { SpecificationLine } from "@/lib/types";
import { isUnifiedMillingLine, unifiedMillingLineTitle } from "@/lib/specification-line-display";

type EditorRowKind = "empty" | "facade" | "facadeUnifiedMilling" | "drilling";

const rowKindOptions: Array<{ value: EditorRowKind; label: string }> = [
  { value: "empty", label: "пустой" },
  { value: "facade", label: "фасад" },
  { value: "facadeUnifiedMilling", label: "фасад е/ф" },
  { value: "drilling", label: "присадки" }
];

function sorted(lines: SpecificationLine[]) {
  return [...lines].sort((first, second) => first.sortOrder - second.sortOrder);
}

function groupTitle(line: SpecificationLine) {
  return line.title || line.description || "";
}

function rowText(line: SpecificationLine) {
  if (isUnifiedMillingLine(line)) {
    return line.description || "";
  }

  return line.description || line.title || "";
}

function rowKind(line: SpecificationLine): EditorRowKind {
  if (line.lineType === "service") {
    return "drilling";
  }

  if (line.lineType === "empty") {
    return "empty";
  }

  if (isUnifiedMillingLine(line)) {
    return "facadeUnifiedMilling";
  }

  return "facade";
}

function kindPayload(kind: EditorRowKind) {
  if (kind === "drilling") {
    return {
      lineType: "service",
      title: "",
      unit: "шт.",
      pricePerM2: ""
    };
  }

  if (kind === "empty") {
    return {
      lineType: "empty",
      title: "",
      unit: "",
      pricePerM2: ""
    };
  }

  if (kind === "facadeUnifiedMilling") {
    return {
      lineType: "product",
      title: unifiedMillingLineTitle,
      unit: "шт."
    };
  }

  return {
    lineType: "product",
    title: "",
    unit: "шт."
  };
}

function groupChildren(lines: SpecificationLine[], groupId: string) {
  return sorted(lines.filter((line) => line.parentId === groupId && line.lineType !== "group"));
}

function ungroupedRows(lines: SpecificationLine[]) {
  return sorted(lines.filter((line) => !line.parentId && line.lineType !== "group"));
}

function lastGroupChild(lines: SpecificationLine[], groupId: string) {
  return groupChildren(lines, groupId).at(-1);
}

export function SpecificationLines({ orderId, lines }: { orderId: string; lines: SpecificationLine[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [isPending, startTransition] = useTransition();
  const scrollToRestore = useRef<number | null>(null);
  const sortedLines = useMemo(() => sorted(lines), [lines]);
  const groups = sortedLines.filter((line) => line.lineType === "group");
  const rowsWithoutGroup = ungroupedRows(sortedLines);

  useEffect(() => {
    if (isPending || scrollToRestore.current == null) {
      return;
    }

    const nextScrollY = scrollToRestore.current;
    scrollToRestore.current = null;

    requestAnimationFrame(() => {
      window.scrollTo(0, nextScrollY);
    });
  }, [isPending]);

  function refreshAfterMutation() {
    scrollToRestore.current = window.scrollY;
    startTransition(() => router.refresh());
  }

  async function mutate(path: string, init: RequestInit, fallbackError: string, shouldRefresh = true) {
    setError("");
    const response = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers }
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? fallbackError);
      return false;
    }

    if (shouldRefresh) {
      refreshAfterMutation();
    }

    return true;
  }

  async function createGroup() {
    setBusyId("create-group");
    const lastLine = sortedLines.at(-1);

    await mutate(
      `/api/orders/${orderId}/lines`,
      {
        method: "POST",
        body: JSON.stringify({
          afterLineId: lastLine?.id,
          lineType: "group",
          title: "Новая группа",
          isPrinted: true
        })
      },
      "Не удалось добавить группу"
    );

    setBusyId("");
  }

  async function createRow(group: SpecificationLine) {
    setBusyId(`create-${group.id}`);
    const afterLine = lastGroupChild(sortedLines, group.id) ?? group;

    await mutate(
      `/api/orders/${orderId}/lines`,
      {
        method: "POST",
        body: JSON.stringify({
          afterLineId: afterLine.id,
          parentId: group.id,
          lineType: "product",
          description: "Новая строка",
          quantity: 1,
          unit: "шт.",
          isPrinted: true
        })
      },
      "Не удалось добавить строку"
    );

    setBusyId("");
  }

  async function saveGroup(line: SpecificationLine, title: string) {
    setBusyId(line.id);
    await mutate(
      `/api/orders/${orderId}/lines`,
      {
        method: "PATCH",
        body: JSON.stringify({ lineId: line.id, title, description: undefined })
      },
      "Не удалось сохранить группу",
      false
    );
    setBusyId("");
  }

  async function saveRow(line: SpecificationLine, formData: FormData) {
    const kind = String(formData.get("rowKind") ?? "facade") as EditorRowKind;
    setBusyId(line.id);
    await mutate(
      `/api/orders/${orderId}/lines`,
      {
        method: "PATCH",
        body: JSON.stringify({
          lineId: line.id,
          ...kindPayload(kind),
          heightMm: kind === "empty" ? "" : formData.get("heightMm"),
          widthMm: kind === "empty" ? "" : formData.get("widthMm"),
          quantity: formData.get("quantity"),
          description: formData.get("description"),
          pricePerM2: kind === "drilling" ? undefined : formData.get("pricePerM2"),
          unitPrice: kind === "drilling" ? formData.get("pricePerM2") : undefined
        })
      },
      "Не удалось сохранить строку",
      false
    );
    setBusyId("");
  }

  async function deleteLine(line: SpecificationLine) {
    setBusyId(line.id);
    await mutate(
      `/api/orders/${orderId}/lines`,
      {
        method: "DELETE",
        body: JSON.stringify({ lineId: line.id })
      },
      "Не удалось удалить строку"
    );
    setBusyId("");
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-semibold text-ink">Табличная часть</h3>
          {error ? <p className="mt-1 text-sm text-red-700">{error}</p> : null}
          {isPending ? <p className="mt-1 text-xs text-muted">Обновление...</p> : null}
        </div>
        <button
          type="button"
          onClick={() => void createGroup()}
          disabled={Boolean(busyId)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line px-3 text-sm"
        >
          <FolderPlus className="h-4 w-4" />
          Группа
        </button>
      </div>

      <div className="divide-y divide-line">
        {groups.map((group) => (
          <GroupEditor
            key={group.id}
            group={group}
            rows={groupChildren(sortedLines, group.id)}
            busyId={busyId}
            onCreateRow={createRow}
            onSaveGroup={saveGroup}
            onSaveRow={saveRow}
            onDelete={deleteLine}
          />
        ))}

        {rowsWithoutGroup.length > 0 ? (
          <div className="px-4 py-3">
            <div className="mb-2 text-xs font-medium uppercase text-muted">Без группы</div>
            <div className="space-y-1">
              {rowsWithoutGroup.map((line) => (
                <LineEditor
                  key={line.id}
                  line={line}
                  isBusy={busyId === line.id}
                  onSave={saveRow}
                  onDelete={deleteLine}
                />
              ))}
            </div>
          </div>
        ) : null}

        {sortedLines.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted">Строк пока нет. Добавьте группу.</div>
        ) : null}
      </div>
    </section>
  );
}

function GroupEditor({
  group,
  rows,
  busyId,
  onCreateRow,
  onSaveGroup,
  onSaveRow,
  onDelete
}: {
  group: SpecificationLine;
  rows: SpecificationLine[];
  busyId: string;
  onCreateRow: (group: SpecificationLine) => Promise<void>;
  onSaveGroup: (line: SpecificationLine, title: string) => Promise<void>;
  onSaveRow: (line: SpecificationLine, formData: FormData) => Promise<void>;
  onDelete: (line: SpecificationLine) => Promise<void>;
}) {
  const [title, setTitle] = useState(groupTitle(group));
  const lastSavedTitle = useRef(groupTitle(group));

  function saveTitle() {
    if (title === lastSavedTitle.current) {
      return;
    }

    lastSavedTitle.current = title;
    void onSaveGroup(group, title);
  }

  function saveTitleOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    saveTitle();
    event.currentTarget.blur();
  }

  return (
    <div className="bg-white">
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-2">
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={saveTitle}
          onKeyDown={saveTitleOnEnter}
          className="h-8 min-w-0 flex-1 rounded-md border-line bg-white text-sm font-medium"
        />
        <IconButton label="Добавить строку" disabled={Boolean(busyId)} onClick={() => void onCreateRow(group)}>
          <Plus className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton label="Удалить группу" disabled={busyId === group.id} danger onClick={() => void onDelete(group)}>
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
      </div>

      <div className="space-y-1 px-3 py-2">
        <div className="grid grid-cols-[108px_78px_78px_78px_minmax(180px,1fr)_92px_34px] gap-1 px-1 text-[11px] uppercase text-muted">
          <div>Тип</div>
          <div>Высота</div>
          <div>Ширина</div>
          <div>Кол-во</div>
          <div>Примечание</div>
          <div>Цена м2</div>
          <div />
        </div>
        {rows.map((line) => (
          <LineEditor
            key={line.id}
            line={line}
            isBusy={busyId === line.id}
            onSave={onSaveRow}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function LineEditor({
  line,
  isBusy,
  onSave,
  onDelete
}: {
  line: SpecificationLine;
  isBusy: boolean;
  onSave: (line: SpecificationLine, formData: FormData) => Promise<void>;
  onDelete: (line: SpecificationLine) => Promise<void>;
}) {
  const lastSubmitted = useRef("");

  function serializedForm(form: HTMLFormElement) {
    return JSON.stringify(Array.from(new FormData(form).entries()));
  }

  function submitForm(form: HTMLFormElement) {
    const nextSubmitted = serializedForm(form);

    if (nextSubmitted === lastSubmitted.current) {
      return;
    }

    lastSubmitted.current = nextSubmitted;
    form.requestSubmit();
  }

  function submitOnFocusLeave(event: FocusEvent<HTMLFormElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) {
      return;
    }

    submitForm(event.currentTarget);
  }

  function submitOnEnter(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    submitForm(event.currentTarget);
    (event.target as HTMLElement).blur();
  }

  return (
    <form
      action={(formData) => void onSave(line, formData)}
      onBlur={submitOnFocusLeave}
      onKeyDown={submitOnEnter}
      className="grid grid-cols-[108px_78px_78px_78px_minmax(180px,1fr)_92px_34px] items-center gap-1"
    >
      <select name="rowKind" defaultValue={rowKind(line)} className="h-8 rounded-md border-line px-2 text-xs">
        {rowKindOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <CompactInput name="heightMm" defaultValue={line.heightMm} />
      <CompactInput name="widthMm" defaultValue={line.widthMm} />
      <CompactInput name="quantity" defaultValue={line.quantity} />
      <input
        name="description"
        defaultValue={rowText(line)}
        className="h-8 min-w-0 rounded-md border-line px-2 text-xs"
      />
      <CompactInput name="pricePerM2" defaultValue={line.lineType === "service" ? line.unitPrice : line.pricePerM2} />
      <IconButton label="Удалить строку" disabled={isBusy} danger onClick={() => void onDelete(line)}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </form>
  );
}

function CompactInput({ name, defaultValue }: { name: string; defaultValue?: number }) {
  return (
    <input
      name={name}
      defaultValue={defaultValue ?? ""}
      inputMode="decimal"
      className="h-8 min-w-0 rounded-md border-line px-2 text-xs"
    />
  );
}

function IconButton({
  label,
  disabled,
  danger,
  onClick,
  children
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-sm ${
        danger ? "border-red-200 text-red-700" : "border-line text-ink"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
