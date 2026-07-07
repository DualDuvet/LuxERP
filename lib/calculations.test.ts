import { describe, expect, it } from "vitest";
import { calculateLine, calculateOrderTotals } from "@/lib/calculations";
import { linesWithUnifiedMillingNotes, unifiedMillingLineTitle } from "@/lib/specification-line-display";
import type { Payment, SpecificationLine } from "@/lib/types";

describe("specification calculations", () => {
  it("calculates product area and amount", () => {
    const line = calculateLine({
      id: "line",
      orderId: "order",
      lineType: "product",
      sortOrder: 10,
      heightMm: 1190,
      widthMm: 348,
      quantity: 6,
      pricePerM2: 13500,
      isCalculated: true,
      isPrinted: true
    });

    expect(line.unitAreaM2).toBe(0.41412);
    expect(line.totalAreaM2).toBe(2.48472);
    expect(line.totalPrice).toBe(33543.72);
  });

  it("excludes group and comment rows from totals", () => {
    const lines: SpecificationLine[] = [
      {
        id: "group",
        orderId: "order",
        lineType: "group",
        sortOrder: 10,
        isCalculated: false,
        isPrinted: true,
        totalPrice: 100000
      },
      {
        id: "product",
        orderId: "order",
        lineType: "product",
        sortOrder: 20,
        heightMm: 1000,
        widthMm: 500,
        quantity: 2,
        pricePerM2: 1000,
        isCalculated: true,
        isPrinted: true
      }
    ];
    const payments: Payment[] = [
      {
        id: "payment",
        orderId: "order",
        paymentType: "prepayment",
        amount: 300,
        paymentDate: "2026-01-23"
      }
    ];

    expect(calculateOrderTotals(lines, payments)).toMatchObject({
      totalAreaM2: 1,
      subtotalAmount: 1000,
      totalAmount: 1000,
      prepaymentAmount: 300,
      balanceAmount: 700
    });
  });

  it("calculates paid amount from payment types", () => {
    const lines: SpecificationLine[] = [
      {
        id: "product",
        orderId: "order",
        lineType: "service",
        sortOrder: 10,
        quantity: 1,
        unitPrice: 1000,
        isCalculated: true,
        isPrinted: true
      }
    ];
    const payments: Payment[] = [
      {
        id: "prepayment",
        orderId: "order",
        paymentType: "prepayment",
        amount: 300,
        paymentDate: "2026-01-23"
      },
      {
        id: "final",
        orderId: "order",
        paymentType: "final_payment",
        amount: 500,
        paymentDate: "2026-01-24"
      },
      {
        id: "refund",
        orderId: "order",
        paymentType: "refund",
        amount: 100,
        paymentDate: "2026-01-25"
      }
    ];

    expect(calculateOrderTotals(lines, payments)).toMatchObject({
      totalAmount: 1000,
      prepaymentAmount: 700,
      balanceAmount: 300
    });
  });

  it("keeps unified milling rows calculated and shares notes with the next row", () => {
    const lines: SpecificationLine[] = [
      calculateLine({
        id: "unified-first",
        orderId: "order",
        lineType: "product",
        sortOrder: 10,
        title: unifiedMillingLineTitle,
        description: "Фрезеровка A",
        heightMm: 1000,
        widthMm: 500,
        quantity: 1,
        pricePerM2: 1000,
        isCalculated: true,
        isPrinted: true
      }),
      calculateLine({
        id: "unified-second",
        orderId: "order",
        lineType: "product",
        sortOrder: 20,
        title: unifiedMillingLineTitle,
        description: "Фрезеровка B",
        heightMm: 900,
        widthMm: 400,
        quantity: 1,
        pricePerM2: 1000,
        isCalculated: true,
        isPrinted: true
      }),
      calculateLine({
        id: "facade",
        orderId: "order",
        lineType: "product",
        sortOrder: 30,
        description: "Фасад основной",
        heightMm: 800,
        widthMm: 300,
        quantity: 1,
        pricePerM2: 1000,
        isCalculated: true,
        isPrinted: true
      })
    ];

    const visibleLines = linesWithUnifiedMillingNotes(lines);

    expect(lines[0].totalPrice).toBe(500);
    expect(visibleLines.map((line) => line.id)).toEqual(["unified-first", "unified-second", "facade"]);
    expect(visibleLines[2].description).toBe("Фрезеровка A Фрезеровка B Фасад основной");
  });
});
