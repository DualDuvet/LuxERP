import type { OrderTotals, Payment, SpecificationLine } from "@/lib/types";

const calculatedLineTypes = new Set([
  "product",
  "service",
  "discount",
  "surcharge",
  "subtotal",
  "total"
]);

const round = (value: number, precision: number) => {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function isLineCalculated(line: SpecificationLine) {
  return line.isCalculated && calculatedLineTypes.has(line.lineType);
}

export function calculateLine(line: SpecificationLine): SpecificationLine {
  if (line.lineType === "product") {
    const quantity = line.quantity ?? 0;
    const unitAreaM2 =
      line.heightMm && line.widthMm ? round((line.heightMm * line.widthMm) / 1_000_000, 6) : 0;
    const totalAreaM2 = round(unitAreaM2 * quantity, 6);
    const unitPrice = round(unitAreaM2 * (line.pricePerM2 ?? 0), 2);

    return {
      ...line,
      unitAreaM2,
      totalAreaM2,
      unitPrice,
      totalPrice: round(unitPrice * quantity, 2)
    };
  }

  if (line.lineType === "service") {
    return {
      ...line,
      unitAreaM2: 0,
      totalAreaM2: 0,
      totalPrice: round((line.quantity ?? 0) * (line.unitPrice ?? 0), 2)
    };
  }

  return line;
}

export function calculateGroupTotals(lines: SpecificationLine[], parentId: string) {
  const children = lines.filter((line) => line.parentId === parentId).map(calculateLine);

  return {
    area: round(
      children.reduce((sum, line) => sum + (isLineCalculated(line) ? line.totalAreaM2 ?? 0 : 0), 0),
      6
    ),
    amount: round(
      children.reduce((sum, line) => sum + (isLineCalculated(line) ? line.totalPrice ?? 0 : 0), 0),
      2
    )
  };
}

export function calculateOrderTotals(lines: SpecificationLine[], payments: Payment[]): OrderTotals {
  const calculatedLines = lines.map(calculateLine).filter(isLineCalculated);
  const subtotalAmount = round(
    calculatedLines
      .filter((line) => !["discount", "surcharge", "total", "subtotal"].includes(line.lineType))
      .reduce((sum, line) => sum + (line.totalPrice ?? 0), 0),
    2
  );
  const discountAmount = Math.abs(
    round(
      calculatedLines
        .filter((line) => line.lineType === "discount")
        .reduce((sum, line) => sum + (line.totalPrice ?? 0), 0),
      2
    )
  );
  const surchargeAmount = round(
    calculatedLines
      .filter((line) => line.lineType === "surcharge")
      .reduce((sum, line) => sum + (line.totalPrice ?? 0), 0),
    2
  );
  const totalAmount = round(subtotalAmount - discountAmount + surchargeAmount, 2);
  const prepaymentAmount = round(
    payments.reduce((sum, payment) => {
      if (payment.paymentType === "refund") {
        return sum - payment.amount;
      }

      if (payment.paymentType === "prepayment" || payment.paymentType === "final_payment" || payment.paymentType === "correction") {
        return sum + payment.amount;
      }

      return sum;
    }, 0),
    2
  );

  return {
    totalAreaM2: round(
      calculatedLines.reduce((sum, line) => sum + (line.totalAreaM2 ?? 0), 0),
      6
    ),
    subtotalAmount,
    discountAmount,
    surchargeAmount,
    totalAmount,
    prepaymentAmount,
    balanceAmount: round(totalAmount - prepaymentAmount, 2)
  };
}

export function formatMoney(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2
  }).format(value);
}

export function formatArea(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 4
  }).format(value);
}
