import { describe, expect, it } from "vitest";
import { normalizeOrderLines, orderLinesInputSchema } from "@/lib/order-form-payload";

describe("order form line payload", () => {
  it("recalculates product and service rows on the server", () => {
    const parsed = orderLinesInputSchema.parse([
      {
        id: "line-product",
        lineType: "product",
        sortOrder: 20,
        description: "Фасад",
        heightMm: 1000,
        widthMm: 500,
        quantity: 2,
        unit: "шт.",
        pricePerM2: 3000,
        isPrinted: true
      },
      {
        id: "line-service",
        lineType: "service",
        sortOrder: 10,
        description: "Монтаж",
        quantity: 3,
        unitPrice: 400,
        isPrinted: true
      }
    ]);

    const lines = normalizeOrderLines("order-1", parsed);

    expect(lines.map((line) => line.id)).toEqual(["line-service", "line-product"]);
    expect(lines[0]).toMatchObject({ orderId: "order-1", sortOrder: 10, totalPrice: 1200 });
    expect(lines[1]).toMatchObject({
      orderId: "order-1",
      sortOrder: 20,
      unitAreaM2: 0.5,
      totalAreaM2: 1,
      unitPrice: 1500,
      totalPrice: 3000
    });
  });

  it("rejects incomplete calculated rows", () => {
    const result = orderLinesInputSchema.safeParse([
      {
        lineType: "product",
        sortOrder: 10,
        description: "",
        quantity: 0,
        isPrinted: true
      }
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["0.description", "0.heightMm", "0.widthMm", "0.quantity"])
      );
    }
  });

  it("preserves group relationships and normalizes sort order", () => {
    const parsed = orderLinesInputSchema.parse([
      { id: "group-1", lineType: "group", sortOrder: 90, title: "Кухня", isPrinted: true },
      {
        id: "line-1",
        parentId: "group-1",
        lineType: "service",
        sortOrder: 120,
        description: "Доставка",
        quantity: 1,
        unitPrice: 500,
        isPrinted: true
      }
    ]);

    expect(normalizeOrderLines("order-2", parsed)).toMatchObject([
      { id: "group-1", sortOrder: 10, parentId: null },
      { id: "line-1", sortOrder: 20, parentId: "group-1" }
    ]);
  });
});
