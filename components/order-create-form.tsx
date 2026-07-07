"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { DictionariesState } from "@/lib/dictionaries";
import { orderStatusLabels } from "@/lib/order-status-flow";
import { orderStatuses, type CustomerLookupItem, type Order } from "@/lib/types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function activeItems<T extends { isActive: boolean }>(items: T[]) {
  return items.filter((item) => item.isActive);
}

export function OrderCreateForm({ dictionaries }: { dictionaries: DictionariesState }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const legalTypes = activeItems(dictionaries.legalTypes);
  const defaultLegalType = legalTypes[0]?.code ?? "ИП";
  const [customerName, setCustomerName] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerLegalType, setCustomerLegalType] = useState(defaultLegalType);
  const [customerOptions, setCustomerOptions] = useState<CustomerLookupItem[]>([]);
  const [deliveryRequired, setDeliveryRequired] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const millingOptions = activeItems(dictionaries.millingTypes);

  useEffect(() => {
    setCustomerLegalType((current) => current || defaultLegalType);
  }, [defaultLegalType]);

  useEffect(() => {
    let isCancelled = false;

    async function loadCustomers() {
      const params = new URLSearchParams();

      if (customerName.trim()) {
        params.set("query", customerName.trim());
      }

      const response = await fetch(`/api/customers?${params.toString()}`, {
        credentials: "same-origin"
      });

      if (!response.ok) {
        if (!isCancelled) {
          setCustomerOptions([]);
        }
        return;
      }

      const body = (await response.json()) as { data?: CustomerLookupItem[] };

      if (!isCancelled) {
        setCustomerOptions(body.data ?? []);
      }
    }

    loadCustomers().catch(() => {
      if (!isCancelled) {
        setCustomerOptions([]);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [customerName]);

  const customerIndex = useMemo(
    () =>
      new Map(
        customerOptions.map((customer) => [customer.name.trim().toLowerCase(), customer] as const)
      ),
    [customerOptions]
  );

  async function submit(formData: FormData) {
    setError("");

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specificationNumber: formData.get("specificationNumber"),
        documentDate: formData.get("documentDate"),
        customerId: formData.get("customerId"),
        customerName: formData.get("customerName"),
        customerLegalType: formData.get("customerLegalType"),
        status: formData.get("status"),
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
      })
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Не удалось создать заказ");
      return;
    }

    const body = (await response.json()) as { data?: Order };
    const orderId = body.data?.id;

    if (!orderId) {
      setError("Заказ создан, но сервер не вернул идентификатор");
      return;
    }

    startTransition(() => {
      router.push(`/orders/${orderId}`);
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-line bg-white p-4 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">Новый заказ</h3>
          <p className="mt-1 text-xs text-muted">После создания можно добавить строки спецификации и платежи.</p>
        </div>
        {isPending ? <span className="text-xs text-muted">Создание...</span> : null}
      </div>

      <form action={submit} className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-muted">Номер спецификации</span>
          <input name="specificationNumber" className="w-full rounded-md border-line text-sm" required />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Заказчик</span>
          <input type="hidden" name="customerId" value={customerId} />
          <input
            name="customerName"
            list="customer-name-suggestions"
            value={customerName}
            onChange={(event) => {
              const nextName = event.target.value;
              const matchedCustomer = customerIndex.get(nextName.trim().toLowerCase());

              setCustomerName(nextName);
              setCustomerId(matchedCustomer?.id ?? "");
              setCustomerLegalType(matchedCustomer?.legalType ?? defaultLegalType);
            }}
            className="w-full rounded-md border-line text-sm"
            required
          />
          <datalist id="customer-name-suggestions">
            {customerOptions.map((customer) => (
              <option key={customer.id} value={customer.name}>
                {customer.legalType}
              </option>
            ))}
          </datalist>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Тип клиента</span>
          <select
            name="customerLegalType"
            value={customerLegalType}
            onChange={(event) => setCustomerLegalType(event.target.value)}
            className="w-full rounded-md border-line text-sm"
          >
            {legalTypes.map((item) => (
              <option key={item.id} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Статус</span>
          <select name="status" defaultValue="draft" className="w-full rounded-md border-line text-sm">
            {orderStatuses.map((status) => (
              <option key={status} value={status}>
                {orderStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Дата оформления</span>
          <input name="documentDate" type="date" defaultValue={today()} className="w-full rounded-md border-line text-sm" required />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">В производство</span>
          <input name="productionStartedAt" type="date" className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Плановая готовность</span>
          <input name="readyAt" type="date" className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Категория</span>
          <select name="category" defaultValue="" className="w-full rounded-md border-line text-sm">
            <option value="">Не указана</option>
            {activeItems(dictionaries.productCategories).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Материал</span>
          <select name="materialType" defaultValue="" className="w-full rounded-md border-line text-sm">
            <option value="">Не указан</option>
            {activeItems(dictionaries.materialTypes).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Фрезеровка</span>
          <input name="millingType" list="milling-type-suggestions" className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Толщина</span>
          <select name="thicknessMm" defaultValue="" className="w-full rounded-md border-line text-sm">
            <option value="">Не указана</option>
            {activeItems(dictionaries.thicknesses).map((item) => (
              <option key={item.id} value={item.name}>
                {item.name} мм
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-muted">Цвет</span>
          <input name="colorCode" className="w-full rounded-md border-line text-sm" />
        </label>

        <label className="space-y-1 md:col-span-2 xl:col-span-4">
          <span className="text-xs text-muted">Стыковка / примечание</span>
          <input name="jointingNote" className="w-full rounded-md border-line text-sm" />
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
            <span className="block text-xs text-muted">Добавит адрес доставки в заказ и печатную форму.</span>
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
            Создать заказ
          </button>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
        </div>
      </form>
    </section>
  );
}
