import { formatArea, formatMoney } from "@/lib/calculations";
import { linesWithUnifiedMillingNotes, specificationLineText } from "@/lib/specification-line-display";
import type { Order } from "@/lib/types";

export function PrintSpecification({ order }: { order: Order }) {
  const printableLines = order.lines
    .filter((line) => line.isPrinted);
  const visibleLines = linesWithUnifiedMillingNotes(printableLines);

  return (
    <article className="mx-auto max-w-5xl bg-white p-8 text-ink">
      <header className="grid grid-cols-[1fr_auto] gap-6 border-b border-ink pb-5">
        <div>
          <div className="mb-4 h-12 w-36 border border-line text-center text-xs leading-[3rem] text-muted">
            Логотип
          </div>
          <h1 className="text-2xl font-semibold">Спецификация № {order.specificationNumber}</h1>
          <p className="mt-1 text-sm">Дата оформления: {order.documentDate}</p>
        </div>
        <dl className="min-w-72 text-sm">
          <div className="flex justify-between gap-6">
            <dt>Заказчик</dt>
            <dd>
              {order.customerLegalType} {order.customer.name}
            </dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Статус</dt>
            <dd>{order.status}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>В производство</dt>
            <dd>{order.productionStartedAt ?? ""}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt>Готовность</dt>
            <dd>{order.readyAt ?? ""}</dd>
          </div>
        </dl>
      </header>

      <section className="mt-5 text-sm">
        <p>Категория: {order.category?.name ?? ""}</p>
        <p>
          Материал: {order.materialType?.name ?? ""}, толщина: {order.thicknessMm ?? ""} мм,
          фрезеровка: {order.millingType?.name ?? ""}
        </p>
      </section>

      <table className="mt-5 w-full border-collapse text-sm">
        <thead>
          <tr className="border-y border-ink text-left">
            <th className="py-2">Описание</th>
            <th className="py-2 text-right">Кол-во</th>
            <th className="py-2 text-right">Площадь</th>
            <th className="py-2 text-right">Сумма</th>
          </tr>
        </thead>
        <tbody>
          {visibleLines.map((line) => (
            <tr key={line.id} className={line.lineType === "group" ? "border-t border-line font-semibold" : ""}>
              <td className="py-2">
                {line.parentId ? "  " : ""}
                {specificationLineText(line)}
              </td>
              <td className="py-2 text-right">{line.quantity ?? ""}</td>
              <td className="py-2 text-right">{line.totalAreaM2 ? formatArea(line.totalAreaM2) : ""}</td>
              <td className="py-2 text-right">{line.totalPrice ? formatMoney(line.totalPrice) : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="mt-8 grid grid-cols-2 gap-8">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>Итого</dt>
            <dd>{formatMoney(order.totalAmount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Предоплата</dt>
            <dd>{formatMoney(order.prepaymentAmount)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Остаток</dt>
            <dd>{formatMoney(order.balanceAmount)}</dd>
          </div>
        </dl>
        <div className="space-y-5 text-sm">
          <p>Исполнитель: __________________</p>
          <p>Заказчик: __________________</p>
        </div>
      </footer>
    </article>
  );
}
