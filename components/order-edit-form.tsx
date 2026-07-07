"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DictionariesState, LegalTypeDictionaryItem } from "@/lib/dictionaries";
import { getQrStatusActionLabel, getQrStatusChoices, orderStatusLabels } from "@/lib/order-status-flow";
import type { DictionaryItem, Order } from "@/lib/types";

function inputValue(value: unknown) {
  return value == null ? "" : String(value);
}

function optionsWithCurrent<T extends DictionaryItem>(items: T[], currentName?: string) {
  const activeItems = items.filter((item) => item.isActive);

  if (!currentName || activeItems.some((item) => item.name === currentName)) {
    return activeItems;
  }

  const currentItem = items.find((item) => item.name === currentName);
  return currentItem ? [...activeItems, currentItem] : activeItems;
}

function legalOptionsWithCurrent(items: LegalTypeDictionaryItem[], currentCode: string) {
  const activeItems = items.filter((item) => item.isActive);

  if (activeItems.some((item) => item.code === currentCode)) {
    return activeItems;
  }

  const currentItem = items.find((item) => item.code === currentCode || item.name === currentCode);
  return currentItem ? [...activeItems, currentItem] : activeItems;
}

export function OrderEditForm({ order, dictionaries }: { order: Order; dictionaries: DictionariesState }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deliveryRequired, setDeliveryRequired] = useState(order.deliveryRequired ?? false);
  const [deliveryAddress, setDeliveryAddress] = useState(inputValue(order.deliveryAddress));
  const availableStatusActions = getQrStatusChoices(order.status);
  const millingOptions = optionsWithCurrent(dictionaries.millingTypes, order.millingType?.name);

  async function submit(formData: FormData) {
    setError("");

    const payload = {
      customerName: formData.get("customerName"),
      customerLegalType: formData.get("customerLegalType"),
      statusAction: formData.get("statusAction"),
      documentDate: formData.get("documentDate"),
      productionStartedAt: formData.get("productionStartedAt"),
      readyAt: formData.get("readyAt"),
      category: { name: formData.get("category") },
      materialType: { name: formData.get("materialType") },
      millingType: { name: formData.get("millingType") },
      thicknessMm: formData.get("thicknessMm"),
      colorCode: formData.get("colorCode"),
      jointingNote: formData.get("jointingNote"),
      deliveryRequired,
      deliveryAddress
    };

    const response = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Не удалось сохранить заказ");
      return;
    }

    startTransition(() => {
      router.push(`/orders/${order.id}`);
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Редактирование заказа</h3>
          <p className="mt-1 text-xs text-muted">Текущий статус: {orderStatusLabels[order.status]}</p>
        </div>
        {isPending ? <span className="text-xs text-muted">Обновление...</span> : null}
      </div>

      <form action={submit} className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-muted">Заказчик</span>
          <input name="customerName" defaultValue={order.customer.name} className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Тип клиента</span>
          <select name="customerLegalType" defaultValue={order.customerLegalType} className="w-full rounded-md border-line text-sm">
            {legalOptionsWithCurrent(dictionaries.legalTypes, order.customerLegalType).map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Следующее действие</span>
          <select name="statusAction" defaultValue="" className="w-full rounded-md border-line text-sm">
            <option value="">Без смены статуса</option>
            {availableStatusActions.map((action) => (
              <option key={action} value={action}>
                {getQrStatusActionLabel(order.status, action)}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Дата оформления</span>
          <input name="documentDate" type="date" defaultValue={order.documentDate} className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">В производство</span>
          <input name="productionStartedAt" type="date" defaultValue={inputValue(order.productionStartedAt)} className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Плановая готовность</span>
          <input name="readyAt" type="date" defaultValue={inputValue(order.readyAt)} className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Категория</span>
          <select name="category" defaultValue={inputValue(order.category?.name)} className="w-full rounded-md border-line text-sm">
            <option value="">Не указана</option>
            {optionsWithCurrent(dictionaries.productCategories, order.category?.name).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Материал</span>
          <select name="materialType" defaultValue={inputValue(order.materialType?.name)} className="w-full rounded-md border-line text-sm">
            <option value="">Не указан</option>
            {optionsWithCurrent(dictionaries.materialTypes, order.materialType?.name).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Фрезеровка</span>
          <input
            name="millingType"
            list="milling-type-suggestions"
            defaultValue={inputValue(order.millingType?.name)}
            className="w-full rounded-md border-line text-sm"
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Толщина</span>
          <select name="thicknessMm" defaultValue={inputValue(order.thicknessMm)} className="w-full rounded-md border-line text-sm">
            <option value="">Не указана</option>
            {optionsWithCurrent(dictionaries.thicknesses, inputValue(order.thicknessMm)).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} мм
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Цвет</span>
          <input name="colorCode" defaultValue={inputValue(order.colorCode)} className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1 md:col-span-2 xl:col-span-4">
          <span className="text-xs text-muted">Стыковка / примечание</span>
          <input name="jointingNote" defaultValue={inputValue(order.jointingNote)} className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="flex items-center gap-3 rounded-md border border-line bg-slate-50 px-3 py-2 xl:col-span-2">
          <input
            type="checkbox"
            name="deliveryRequired"
            checked={deliveryRequired}
            onChange={(event) => setDeliveryRequired(event.target.checked)}
            className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
          />
          <span>
            <span className="block text-sm font-medium text-ink">Нужна доставка</span>
            <span className="block text-xs text-muted">При печати будет выделен блок доставки с адресом.</span>
          </span>
        </label>

        {deliveryRequired ? (
          <label className="space-y-1 md:col-span-2 xl:col-span-4">
            <span className="text-xs text-muted">Адрес доставки</span>
            <textarea
              name="deliveryAddress"
              rows={3}
              value={deliveryAddress}
              onChange={(event) => setDeliveryAddress(event.target.value)}
              className="w-full rounded-md border-line text-sm"
              placeholder="Укажите адрес, подъезд, этаж, контакт для получения"
            />
          </label>
        ) : null}

        <datalist id="milling-type-suggestions">
          {millingOptions.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>

        <div className="flex items-end gap-3 xl:col-span-4">
          <button className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white" disabled={isPending}>
            Сохранить
          </button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
