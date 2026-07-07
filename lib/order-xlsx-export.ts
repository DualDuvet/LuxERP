import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { linesWithUnifiedMillingNotes, specificationLineText } from "@/lib/specification-line-display";
import type { Order, SpecificationLine } from "@/lib/types";

const defaultTemplatePath = path.join(process.cwd(), "docs", "124,05.xlsx");
const firstLineRow = 18;
const lastTemplateLineRow = 25;

function text(value: unknown) {
  return String(value ?? "");
}

function visibleText(line: SpecificationLine) {
  return text(specificationLineText(line));
}

export function orderXlsxFileName(specificationNumber: string) {
  const safeNumber = text(specificationNumber)
    .replaceAll(/[^\p{L}\p{N}._-]+/gu, "-")
    .replaceAll(/^-|-$/g, "");

  return `specification-${safeNumber || "order"}.xlsx`;
}

function asDate(value: string | undefined) {
  return value ? new Date(`${value}T00:00:00.000Z`) : undefined;
}

function numberOrBlank(value: number | undefined) {
  return value ?? "";
}

function statusText(status: Order["status"]) {
  const labels: Record<Order["status"], string> = {
    draft: "Черновик",
    confirmed: "Подтвержден",
    in_production: "В ПРОИЗВОДСТВЕ",
    on_hold: "На паузе",
    ready: "Готов",
    shipped: "Отгружен",
    closed: "Закрыт",
    cancelled: "Отменен"
  };

  return labels[status] ?? status;
}

function findTemplateSheet(workbook: ExcelJS.Workbook, namePart: string, fallbackIndex: number) {
  const normalizedNamePart = namePart.toLowerCase();

  return (
    workbook.worksheets.find((worksheet) => worksheet.name.toLowerCase().includes(normalizedNamePart)) ??
    workbook.worksheets[fallbackIndex]
  );
}

function mergeIfNeeded(worksheet: ExcelJS.Worksheet, range: string) {
  try {
    worksheet.mergeCells(range);
  } catch {
    // The source template often already contains these merges.
  }
}

function clearCellValues(worksheet: ExcelJS.Worksheet, fromRow: number, toRow: number, fromColumn: number, toColumn: number) {
  for (let rowNumber = fromRow; rowNumber <= toRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    for (let columnNumber = fromColumn; columnNumber <= toColumn; columnNumber += 1) {
      row.getCell(columnNumber).value = null;
    }
  }
}

function writeHeader(worksheet: ExcelJS.Worksheet, order: Order) {
  worksheet.getCell("G6").value = order.specificationNumber;
  worksheet.getCell("I6").value = asDate(order.documentDate) ?? order.documentDate;
  worksheet.getCell("K6").value = text(order.customerLegalType);
  worksheet.getCell("L6").value = text(order.customer.name);

  worksheet.getCell("L8").value = statusText(order.status);
  worksheet.getCell("N8").value = asDate(order.productionStartedAt) ?? "";
  worksheet.getCell("N9").value = asDate(order.readyAt) ?? "";
  worksheet.getCell("N10").value = asDate(order.shippedAt) ?? "";

  worksheet.getCell("B10").value = text(order.category?.name);
  worksheet.getCell("D10").value = text(order.materialType?.name);
  worksheet.getCell("F10").value = numberOrBlank(order.thicknessMm);
  worksheet.getCell("G10").value = text(order.millingType?.name ?? order.colorCode);
  worksheet.getCell("C12").value = text(order.colorCode);

  worksheet.getCell("N12").value = order.balanceAmount;
  worksheet.getCell("N13").value = order.prepaymentAmount;
  worksheet.getCell("K15").value = order.totalAreaM2;
  worksheet.getCell("N15").value = order.totalAmount;
  worksheet.getCell("D15").value = text(order.jointingNote);
}

function writeDictionaryValues(worksheet: ExcelJS.Worksheet | undefined, order: Order) {
  if (!worksheet) {
    return;
  }

  worksheet.getCell("A3").value = text(order.category?.name);
  worksheet.getCell("C3").value = text(order.materialType?.name);
  worksheet.getCell("F3").value = numberOrBlank(order.thicknessMm);
  worksheet.getCell("H3").value = text(order.millingType?.name);
  worksheet.getCell("J3").value = text(order.customerLegalType);
}

function prepareLineRows(worksheet: ExcelJS.Worksheet, lineCount: number) {
  const capacity = lastTemplateLineRow - firstLineRow + 1;
  const extraLineCount = Math.max(0, lineCount - capacity);

  if (extraLineCount > 0) {
    worksheet.duplicateRow(lastTemplateLineRow, extraLineCount, true);
  }

  clearCellValues(worksheet, firstLineRow, lastTemplateLineRow + extraLineCount, 2, 14);
}

function writeLine(worksheet: ExcelJS.Worksheet, rowNumber: number, line: SpecificationLine) {
  const row = worksheet.getRow(rowNumber);

  row.height = line.lineType === "group" ? 18 : 24;
  mergeIfNeeded(worksheet, `E${rowNumber}:I${rowNumber}`);

  if (line.lineType === "group") {
    worksheet.getCell(rowNumber, 5).value = visibleText(line);
    row.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F2F1" } };
      cell.font = { ...cell.font, bold: true };
    });
    return;
  }

  const isService = line.lineType === "service";

  worksheet.getCell(rowNumber, 2).value = numberOrBlank(isService ? undefined : line.heightMm);
  worksheet.getCell(rowNumber, 3).value = numberOrBlank(isService ? undefined : line.widthMm);
  worksheet.getCell(rowNumber, 4).value = numberOrBlank(line.quantity);
  worksheet.getCell(rowNumber, 5).value = visibleText(line);
  worksheet.getCell(rowNumber, 10).value = numberOrBlank(isService ? undefined : line.pricePerM2);
  worksheet.getCell(rowNumber, 11).value = numberOrBlank(line.unitAreaM2);
  worksheet.getCell(rowNumber, 12).value = numberOrBlank(line.totalAreaM2);
  worksheet.getCell(rowNumber, 13).value = numberOrBlank(line.unitPrice);
  worksheet.getCell(rowNumber, 14).value = numberOrBlank(line.totalPrice);
}

export async function renderOrderXlsx(order: Order, templatePath = defaultTemplatePath) {
  const templateBuffer = await readFile(templatePath);
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(templateBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  workbook.creator = "LuxERP";
  workbook.modified = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  const specificationSheet = findTemplateSheet(workbook, "спец", 0);

  if (!specificationSheet) {
    throw new Error("XLSX template does not contain a specification sheet.");
  }

  const printedLines = order.lines
    .filter((line) => line.isPrinted);
  const visibleLines = linesWithUnifiedMillingNotes(printedLines);

  writeHeader(specificationSheet, order);
  prepareLineRows(specificationSheet, visibleLines.length);

  visibleLines.forEach((line, index) => {
    writeLine(specificationSheet, firstLineRow + index, line);
  });

  writeDictionaryValues(findTemplateSheet(workbook, "лист1", 1), order);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
