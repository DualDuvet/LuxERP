import { calculateOrderTotals } from "@/lib/calculations";
import type { Order, OrderStatus } from "@/lib/types";
import type { ParsedXmlPreview } from "@/lib/xml-import";

function makeId(value: string) {
  return value
    .toLowerCase()
    .replaceAll("/", "-")
    .replaceAll(" ", "-")
    .replace(/[^a-zа-я0-9-]/gi, "");
}

function dictionaryItem(name: string | undefined, prefix: string) {
  if (!name) {
    return undefined;
  }

  return {
    id: `${prefix}-${makeId(name)}`,
    name,
    isActive: true
  };
}

export function normalizeImportPreview(preview: ParsedXmlPreview): Order {
  const orderId = `import-${makeId(preview.order.specificationNumber || "unknown")}`;
  const customerId = `customer-${makeId(preview.order.customerName || "unknown")}`;
  const lines = preview.lines.map((line) => ({ ...line, orderId }));
  const payments = preview.payments.map((payment) => ({ ...payment, orderId }));
  const totals = calculateOrderTotals(lines, payments);
  const importedAt = new Date().toISOString();

  return {
    id: orderId,
    specificationNumber: preview.order.specificationNumber,
    documentDate: preview.order.documentDate,
    customer: {
      id: customerId,
      name: preview.order.customerName,
      legalType: preview.order.customerLegalType as Order["customerLegalType"],
      isActive: true
    },
    customerLegalType: preview.order.customerLegalType as Order["customerLegalType"],
    status: preview.order.status as OrderStatus,
    productionStartedAt: preview.order.productionStartedAt,
    readyAt: preview.order.readyAt,
    shippedAt: preview.order.shippedAt,
    category: dictionaryItem(preview.order.category, "category"),
    materialType: dictionaryItem(preview.order.materialType, "material"),
    thicknessMm: preview.order.thicknessMm,
    colorCode: preview.order.colorCode,
    jointingNote: preview.order.jointingNote,
    totalAreaM2: preview.order.totalAreaM2 || totals.totalAreaM2,
    subtotalAmount: totals.subtotalAmount,
    discountAmount: totals.discountAmount,
    surchargeAmount: totals.surchargeAmount,
    prepaymentAmount: preview.order.prepaymentAmount || totals.prepaymentAmount,
    balanceAmount: preview.order.balanceAmount || totals.balanceAmount,
    totalAmount: preview.order.totalAmount || totals.totalAmount,
    lines,
    payments,
    statusHistory: [
      {
        id: `${orderId}-import-history`,
        orderId,
        status: preview.order.status as OrderStatus,
        changedAt: importedAt,
        comment: `Imported from ${preview.source}`
      }
    ],
    createdAt: importedAt,
    updatedAt: importedAt
  };
}
