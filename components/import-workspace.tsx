"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle, FileInput, Loader2, Upload } from "lucide-react";
import { formatArea, formatMoney } from "@/lib/calculations";
import type { Order } from "@/lib/types";
import type { ParsedXmlPreview } from "@/lib/xml-import";

type ConfirmResult = {
  data: {
    order: Order;
    savedTo?: string;
    orderSavedTo?: string;
    message: string;
  };
};

function previewLineText(line: ParsedXmlPreview["lines"][number]) {
  if (line.lineType === "group" || line.lineType === "service") {
    return line.title ?? line.description ?? "";
  }

  return line.description ?? "";
}

export function ImportWorkspace({ initialPreview }: { initialPreview: ParsedXmlPreview | null }) {
  const [preview, setPreview] = useState<ParsedXmlPreview | null>(initialPreview);
  const [confirmed, setConfirmed] = useState<ConfirmResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);

  async function uploadFile(formData: FormData) {
    setIsPreviewLoading(true);
    setConfirmed(null);
    setError(null);

    try {
      const response = await fetch("/api/import/specification/preview", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Не удалось разобрать файл");
      }

      setPreview(payload.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось разобрать файл");
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function confirmImport() {
    if (!preview) {
      return;
    }

    setIsConfirmLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/import/specification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preview })
      });
      const payload = (await response.json()) as ConfirmResult | { error?: string };

      if (!response.ok || !("data" in payload)) {
        throw new Error("error" in payload ? payload.error : "Не удалось подтвердить импорт");
      }

      setConfirmed(payload.data);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Не удалось подтвердить импорт");
    } finally {
      setIsConfirmLoading(false);
    }
  }

  if (!preview) {
    return (
      <div className="space-y-5">
        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Импорт Excel/XML</p>
              <h2 className="text-2xl font-semibold text-ink">Предпросмотр спецификации</h2>
            </div>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                uploadFile(new FormData(event.currentTarget));
              }}
            >
              <input
                name="file"
                type="file"
                accept=".xml,.xlsx,application/xml,text/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="max-w-72 rounded-md border border-line bg-white px-3 py-2 text-sm"
                required
              />
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
                disabled={isPreviewLoading}
              >
                {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Загрузить
              </button>
            </form>
          </div>
          {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        </section>

        <section className="rounded-md border border-dashed border-line bg-white p-6 text-sm text-muted">
          Выберите XML или XLSX файл, чтобы открыть предпросмотр импорта.
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Импорт Excel/XML</p>
            <h2 className="text-2xl font-semibold text-ink">Предпросмотр спецификации</h2>
            <p className="mt-1 text-sm text-muted">Загрузите Excel XML или XLSX файл из старой формы и проверьте распознанные данные.</p>
          </div>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              uploadFile(new FormData(event.currentTarget));
            }}
          >
            <input
              name="file"
              type="file"
              accept=".xml,.xlsx,application/xml,text/xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="max-w-72 rounded-md border border-line bg-white px-3 py-2 text-sm"
              required
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
              disabled={isPreviewLoading}
            >
              {isPreviewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Загрузить
            </button>
          </form>
        </div>
        {error ? <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Источник", preview.source],
          ["Спецификация", preview.order.specificationNumber],
          ["Заказчик", `${preview.order.customerLegalType} ${preview.order.customerName}`],
          ["Листов", `${preview.worksheetNames.length}`]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-line bg-white p-4 shadow-soft">
            <p className="text-xs uppercase text-muted">{label}</p>
            <p className="mt-2 break-words text-lg font-semibold text-ink">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h3 className="font-semibold text-ink">Шапка и параметры</h3>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-muted">Дата</dt><dd>{preview.order.documentDate}</dd>
            <dt className="text-muted">Статус</dt><dd>{preview.order.status}</dd>
            <dt className="text-muted">В производство</dt><dd>{preview.order.productionStartedAt ?? "Не указано"}</dd>
            <dt className="text-muted">Готовность</dt><dd>{preview.order.readyAt ?? "Не указана"}</dd>
            <dt className="text-muted">Категория</dt><dd>{preview.order.category ?? "Не указана"}</dd>
            <dt className="text-muted">Материал</dt><dd>{preview.order.materialType ?? "Не указан"}</dd>
            <dt className="text-muted">Толщина</dt><dd>{preview.order.thicknessMm ? `${preview.order.thicknessMm} мм` : "Не указана"}</dd>
            <dt className="text-muted">Цвет</dt><dd>{preview.order.colorCode ?? "Не указан"}</dd>
          </dl>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <h3 className="font-semibold text-ink">Итоги импорта</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Строк</dt><dd>{preview.lines.length}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Площадь</dt><dd>{formatArea(preview.order.totalAreaM2)} м²</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Итого</dt><dd>{formatMoney(preview.order.totalAmount)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Предоплата</dt><dd>{formatMoney(preview.order.prepaymentAmount)}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 font-semibold"><dt>Остаток</dt><dd>{formatMoney(preview.order.balanceAmount)}</dd></div>
          </dl>
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white"
            onClick={confirmImport}
            disabled={isConfirmLoading}
          >
            {isConfirmLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
            Подтвердить импорт
          </button>
        </div>
      </section>

      {confirmed ? (
        <section className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-medium">{confirmed.message}</p>
          <p className="mt-1">Заказ: {confirmed.order.specificationNumber}. Файл: {confirmed.savedTo ?? "не сохранён"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href={`/orders/${confirmed.order.id}`}
              className="inline-flex items-center justify-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
            >
              Открыть карточку заказа
            </Link>
            <Link
              href="/orders"
              className="inline-flex items-center justify-center rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm font-medium text-emerald-800"
            >
              Перейти в список
            </Link>
          </div>
        </section>
      ) : null}

      <section className="rounded-md border border-line bg-white shadow-soft">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <FileInput className="h-4 w-4 text-accent" />
          <h3 className="font-semibold text-ink">Распознанные строки</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-panel text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Тип</th>
                <th className="px-3 py-2">Описание</th>
                <th className="px-3 py-2 text-right">Высота</th>
                <th className="px-3 py-2 text-right">Ширина</th>
                <th className="px-3 py-2 text-right">Кол-во</th>
                <th className="px-3 py-2 text-right">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {preview.lines.map((line) => (
                <tr key={line.id} className="border-t border-line">
                  <td className="px-3 py-2">{line.lineType}</td>
                  <td className="px-3 py-2">{previewLineText(line)}</td>
                  <td className="px-3 py-2 text-right">{line.heightMm ?? ""}</td>
                  <td className="px-3 py-2 text-right">{line.widthMm ?? ""}</td>
                  <td className="px-3 py-2 text-right">{line.quantity ?? ""}</td>
                  <td className="px-3 py-2 text-right">{line.totalPrice ? formatMoney(line.totalPrice) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
