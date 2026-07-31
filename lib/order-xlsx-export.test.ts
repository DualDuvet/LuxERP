import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { calculateLine, calculateOrderTotals } from "@/lib/calculations";
import { renderOrderXlsx } from "@/lib/order-xlsx-export";
import type { Order, Payment, SpecificationLine } from "@/lib/types";

function makeOrder(): Order {
  const rawLines: SpecificationLine[] = [
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
  ];
  const lines = rawLines.map(calculateLine);
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
    const workbook = new ExcelJS.Workbook();
    const buffer = await renderOrderXlsx(order);
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]
    );
    const worksheet = workbook.worksheets[0];

    expect(worksheet.getCell("G6").value).toBe(order.specificationNumber);
    expect(worksheet.getCell("L6").value).toBe(order.customer.name);
    expect([
      worksheet.getCell("E18").value,
      worksheet.getCell("E19").value
    ]).toEqual(["same visible description", "same visible description"]);
    expect([
      worksheet.getCell("B18").value,
      worksheet.getCell("B19").value
    ]).toEqual([1930, 520]);
    expect(worksheet.getCell("D33").value).toBe(2);
    expect(worksheet.getCell("E34").value).toBeNull();
    expect(worksheet.getCell("N16").value).toBe(order.subtotalAmount);
    expect(worksheet.getCell("G6").fill).toMatchObject({
      type: "pattern",
      fgColor: { argb: expect.stringMatching(/^FF([0-9A-F]{2})\1\1$/) }
    });
  });
});
