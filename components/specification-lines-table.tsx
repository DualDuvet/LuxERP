import { calculateGroupTotals, formatArea, formatMoney } from "@/lib/calculations";
import { linesWithUnifiedMillingNotes, specificationLineText } from "@/lib/specification-line-display";
import type { SpecificationLine } from "@/lib/types";

function visibleText(line: SpecificationLine) {
  return specificationLineText(line, "—");
}

export function SpecificationLinesTable({ lines }: { lines: SpecificationLine[] }) {
  const sortedLines = linesWithUnifiedMillingNotes(lines);

  return (
    <section className="rounded-md border border-line bg-white shadow-soft">
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-semibold text-ink">Табличная часть</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-panel text-left text-xs uppercase text-muted">
            <tr>
              <th className="px-3 py-2 text-right font-medium">Высота</th>
              <th className="px-3 py-2 text-right font-medium">Ширина</th>
              <th className="px-3 py-2 text-right font-medium">Кол-во</th>
              <th className="px-3 py-2 font-medium">Описание</th>
              <th className="px-3 py-2 text-right font-medium">Цена за м²</th>
              <th className="px-3 py-2 text-right font-medium">Площадь</th>
              <th className="px-3 py-2 text-right font-medium">Цена за ед.</th>
              <th className="px-3 py-2 text-right font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {sortedLines.map((line) => {
              const isGroup = line.lineType === "group";
              const groupTotals = isGroup ? calculateGroupTotals(lines, line.id) : null;
              const description = visibleText(line);

              return (
                <tr key={line.id} className={isGroup ? "border-t border-line bg-[#eef7f6]" : "border-t border-line"}>
                  <td className="px-3 py-2 text-right">{line.heightMm ?? ""}</td>
                  <td className="px-3 py-2 text-right">{line.widthMm ?? ""}</td>
                  <td className="px-3 py-2 text-right">
                    {line.quantity ?? ""}
                    {line.unit ? ` ${line.unit}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    <div className={line.parentId ? "pl-5" : ""}>
                      <div className={isGroup ? "font-semibold text-ink" : "text-ink"}>{description}</div>
                      {line.lineType !== "product" && line.title && line.description && line.title !== line.description ? (
                        <div className="text-xs text-muted">{line.description}</div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">{line.pricePerM2 ? formatMoney(line.pricePerM2) : ""}</td>
                  <td className="px-3 py-2 text-right">
                    {groupTotals ? formatArea(groupTotals.area) : line.totalAreaM2 ? formatArea(line.totalAreaM2) : ""}
                  </td>
                  <td className="px-3 py-2 text-right">{line.unitPrice ? formatMoney(line.unitPrice) : ""}</td>
                  <td className="px-3 py-2 text-right font-medium">
                    {groupTotals ? formatMoney(groupTotals.amount) : line.totalPrice ? formatMoney(line.totalPrice) : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
