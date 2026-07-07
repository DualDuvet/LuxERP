import { describe, expect, it } from "vitest";
import { calculateLine, calculateOrderTotals } from "@/lib/calculations";
import { renderOrderXlsx } from "@/lib/order-xlsx-export";
import { parseSpreadsheetXlsxBuffer } from "@/lib/xml-import";
import type { Order, Payment, SpecificationLine } from "@/lib/types";

function makeOrder(): Order {
  const lines: SpecificationLine[] = [
    {
      id: "same-description-a",
      orderId: "order-xlsx-test",
      parentId: null,
      lineType: "product",
      sortOrder: 10,
      description: "same visible description",
      heightMm: 1930,
      widthMm: 565,
      quantity: 1,
      unit: "шт",
      pricePerM2: 12500,
      isCalculated: true,
      isPrinted: true
    },
    {
      id: "same-description-b",
      orderId: "order-xlsx-test",
      parentId: null,
      lineType: "product",
      sortOrder: 20,
      description: "same visible description",
      heightMm: 520,
      widthMm: 565,
      quantity: 1,
      unit: "шт",
      pricePerM2: 12500,
      isCalculated: true,
      isPrinted: true
    }
  ].map(calculateLine);
  const payments: Payment[] = [
    {
      id: "payment-xlsx-test",
      orderId: "order-xlsx-test",
      paymentType: "prepayment",
      amount: 1000,
      paymentDate: "2026-06-20"
    }
  ];
  const totals = calculateOrderTotals(lines, payments);

  return {
    id: "order-xlsx-test",
    specificationNumber: "XLSX-001",
    documentDate: "2026-06-20",
    customer: {
      id: "customer-xlsx-test",
      name: "Template Customer",
      legalType: "ООО",
      isActive: true
    },
    customerLegalType: "ООО",
    status: "in_production",
    productionStartedAt: "2026-06-21",
    readyAt: "2026-06-30",
    category: { id: "category-test", name: "покраска", isActive: true },
    materialType: { id: "material-test", name: "мат/лам", isActive: true },
    thicknessMm: 19,
    colorCode: "9003",
    lines,
    payments,
    statusHistory: [],
    createdAt: "2026-06-20T00:00:00.000Z",
    updatedAt: "2026-06-20T00:00:00.000Z",
    ...totals
  };
}

describe("order xlsx export", () => {
  it("fills a copy of the source workbook template and keeps equal descriptions as separate lines", async () => {
    const order = makeOrder();
    const preview = await parseSpreadsheetXlsxBuffer(await renderOrderXlsx(order), "export.xlsx");
    const productLines = preview.lines.filter((line) => line.lineType === "product");

    expect(preview.order.specificationNumber).toBe(order.specificationNumber);
    expect(preview.order.customerName).toBe(order.customer.name);
    expect(productLines).toHaveLength(2);
    expect(productLines.map((line) => line.description)).toEqual([
      "same visible description",
      "same visible description"
    ]);
    expect(productLines.map((line) => line.heightMm)).toEqual([1930, 520]);
    expect(preview.lines.map((line) => line.title ?? line.description ?? "").join(" ")).not.toContain("РЕМ.КОМПЛЕКТ");
  });
});
