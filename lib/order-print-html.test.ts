import { describe, expect, it } from "vitest";
import { renderPrintHtml } from "@/lib/order-print-html";
import type { Order } from "@/lib/types";

const order: Order = {
  id: "order-print-test",
  specificationNumber: "PRINT-001",
  documentDate: "2026-06-20",
  customer: {
    id: "customer-print-test",
    name: "Print Test",
    legalType: "ИП",
    phone: "+7 999 123-45-67",
    email: "client@example.test",
    isActive: true
  },
  customerLegalType: "ИП",
  status: "draft",
  mainNote: "Note 1",
  jointingNote: "Note 2",
  deliveryRequired: true,
  deliveryAddress: "Санкт-Петербург, Невский пр., 10",
  totalAreaM2: 0,
  subtotalAmount: 0,
  discountAmount: 0,
  surchargeAmount: 0,
  prepaymentAmount: 0,
  balanceAmount: 0,
  totalAmount: 0,
  lines: [],
  payments: [],
  statusHistory: [],
  createdAt: "2026-06-20T00:00:00.000Z",
  updatedAt: "2026-06-20T00:00:00.000Z"
};

describe("order print html", () => {
  it("renders the monochrome specification layout, company details, contacts and delivery block", async () => {
    const html = await renderPrintHtml(order);

    expect(html).toContain('src="/print-logo-bw.png"');
    expect(html).toContain('Общество с ограниченной ответственностью "ФАСАД ЛЮКС"');
    expect(html).toContain("ИНН: 7811641022");
    expect(html).toContain("Расчетный счет: 40702810636060000012");
    expect(html).toContain('Банк: ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)');
    expect(html).toContain("Тел.: +7 (812) 336 43 03");
    expect(html).not.toContain("QR-код статуса заказа");
    expect(html).not.toContain("+ РЕМ.КОМПЛЕКТ");
    expect(html).toContain("#d9d9d9");
    expect(html).not.toContain("#22a447");
    expect(html).toContain("client@example.test");
    expect(html).toContain("ДОСТАВКА");
    expect(html).toContain("Санкт-Петербург, Невский пр., 10");
  });
});
