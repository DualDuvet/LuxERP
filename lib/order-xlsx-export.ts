import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS from "exceljs";
import { linesWithUnifiedMillingNotes, specificationLineText } from "@/lib/specification-line-display";
import type { Order, SpecificationLine } from "@/lib/types";

const defaultTemplatePath = path.join(process.cwd(), "docs", "283,04.xlsx");
const monochromeLogoPath = path.join(process.cwd(), "public", "print-logo-bw.png");
const firstLineRow = 18;
const lastTemplateLineRow = 32;

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
  return value ?? null;
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
  worksheet.getCell("N8").value = asDate(order.productionStartedAt) ?? null;
  worksheet.getCell("N9").value = asDate(order.readyAt) ?? null;
  worksheet.getCell("N10").value = asDate(order.shippedAt) ?? null;

  worksheet.getCell("B10").value = text(order.category?.name);
  worksheet.getCell("D10").value = text(order.materialType?.name);
  worksheet.getCell("F10").value = numberOrBlank(order.thicknessMm);
  worksheet.getCell("G10").value = text(order.millingType?.name ?? order.colorCode);
  worksheet.getCell("C12").value = text(order.colorCode);

  worksheet.getCell("N12").value = order.balanceAmount;
  worksheet.getCell("N13").value = order.prepaymentAmount;
  worksheet.getCell("K15").value = order.totalAreaM2;
  worksheet.getCell("N15").value = order.totalAmount;
  worksheet.getCell("N16").value = order.subtotalAmount;
  worksheet.getCell("D15").value = text(order.jointingNote);
}

function grayscaleColor(argb: string | undefined, fallback = "FF000000") {
  if (!argb || argb.length < 6) {
    return fallback;
  }

  const hex = argb.length === 8 ? argb.slice(2) : argb.slice(-6);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  if ([red, green, blue].some((channel) => Number.isNaN(channel))) {
    return fallback;
  }

  const luminance = Math.round(0.299 * red + 0.587 * green + 0.114 * blue);
  const channel = Math.max(0, Math.min(255, luminance));
  return `FF${channel.toString(16).padStart(2, "0").repeat(3).toUpperCase()}`;
}

function normalizePrintColors(worksheet: ExcelJS.Worksheet, toRow: number) {
  for (let rowNumber = 1; rowNumber <= toRow; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);

    for (let columnNumber = 1; columnNumber <= 14; columnNumber += 1) {
      const cell = row.getCell(columnNumber);
      const fillColor = cell.fill?.type === "pattern" ? cell.fill.fgColor?.argb : undefined;

      if (fillColor) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: grayscaleColor(fillColor, "FFFFFFFF") }
        };
      }

      cell.font = { ...cell.font, color: { argb: "FF000000" } };
    }
  }

}

function removeStaticRepairKit(worksheet: ExcelJS.Worksheet) {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (text(cell.value).trim().toUpperCase() === "+ РЕМ.КОМПЛЕКТ") {
        cell.value = null;
      }
    });
  });
}

async function replaceTemplateLogo(workbook: ExcelJS.Workbook, worksheet: ExcelJS.Worksheet) {
  const logo = await readFile(monochromeLogoPath);

  for (const image of worksheet.getImages()) {
    const imageId = Number(image.imageId);

    if (!Number.isFinite(imageId)) {
      continue;
    }

    const media = workbook.getImage(imageId);
    media.buffer = undefined;
    media.base64 = `data:image/png;base64,${logo.toString("base64")}`;
    media.filename = undefined;
    media.extension = "png";
  }
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
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E7E7" } };
      cell.font = { ...cell.font, bold: true };
    });
    return;
  }

  const isService = line.lineType === "service";

  worksheet.getCell(rowNumber, 2).value = numberOrBlank(isService ? undefined : line.heightMm);
  worksheet.getCell(rowNumber, 3).value = numberOrBlank(isService ? undefined : line.widthMm);
  worksheet.getCell(rowNumber, 4).value = numberOrBlank(line.quantity);
  worksheet.getCell(rowNumber, 5).value = visibleText(line) || null;
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

  const extraLineCount = Math.max(0, visibleLines.length - (lastTemplateLineRow - firstLineRow + 1));
  const totalRow = lastTemplateLineRow + extraLineCount + 1;
  clearCellValues(specificationSheet, totalRow, totalRow, 2, 14);
  specificationSheet.getCell(`D${totalRow}`).value = visibleLines.reduce(
    (total, line) => total + (line.quantity ?? 0),
    0
  );
  specificationSheet.getCell(`N${totalRow}`).value = "-";
  specificationSheet.getCell(`K15`).value = order.totalAreaM2;
  specificationSheet.getCell(`N15`).value = order.totalAmount;
  specificationSheet.getCell(`N16`).value = order.subtotalAmount;
  specificationSheet.getCell(`N12`).value = order.balanceAmount;
  specificationSheet.getCell(`N13`).value = order.prepaymentAmount;
  removeStaticRepairKit(specificationSheet);
  normalizePrintColors(specificationSheet, 48 + extraLineCount);
  specificationSheet.removeConditionalFormatting(undefined);
  await replaceTemplateLogo(workbook, specificationSheet);

  writeDictionaryValues(findTemplateSheet(workbook, "лист1", 1), order);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
