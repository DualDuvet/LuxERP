import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { XMLParser } from "fast-xml-parser";
import { calculateLine, calculateOrderTotals } from "@/lib/calculations";
import type { Payment, SpecificationLine } from "@/lib/types";

type SpreadsheetCell = {
  Data?: unknown;
  "ss:Data"?: unknown;
  "@_ss:Index"?: string;
  "@_ss:MergeAcross"?: string;
};

type SpreadsheetRow = {
  Cell?: SpreadsheetCell | SpreadsheetCell[];
  "@_ss:Index"?: string;
};

type SpreadsheetWorksheet = {
  Table?: {
    Row?: SpreadsheetRow | SpreadsheetRow[];
  };
  "@_ss:Name"?: string;
};

type SpreadsheetWorkbook = {
  Workbook: {
    Worksheet?: SpreadsheetWorksheet | SpreadsheetWorksheet[];
  };
};

export type ParsedXmlPreview = {
  source: string;
  worksheetNames: string[];
  order: {
    specificationNumber: string;
    documentDate: string;
    customerLegalType: string;
    customerName: string;
    status: string;
    productionStartedAt?: string;
    readyAt?: string;
    shippedAt?: string;
    category?: string;
    materialType?: string;
    thicknessMm?: number;
    colorCode?: string;
    jointingNote?: string;
    totalAreaM2: number;
    totalAmount: number;
    prepaymentAmount: number;
    balanceAmount: number;
  };
  lines: SpecificationLine[];
  payments: Payment[];
  dictionaries: {
    productCategories: string[];
    materialTypes: string[];
    thicknesses: string[];
    millingTypes: string[];
    legalTypes: string[];
  };
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function valueFromCell(cell: SpreadsheetCell | undefined): string {
  if (!cell) {
    return "";
  }

  const data = cell.Data ?? cell["ss:Data"];

  if (data == null) {
    return "";
  }

  if (typeof data === "object" && "#text" in data) {
    return String((data as { "#text"?: unknown })["#text"] ?? "").trim();
  }

  return String(data).trim();
}

function toNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.replace(",", "."));
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toDateOnly(value: string | undefined) {
  return value?.slice(0, 10) || undefined;
}

function readRows(worksheet: SpreadsheetWorksheet) {
  let rowNumber = 1;
  const rows: Record<number, string>[] = [];

  for (const row of asArray(worksheet.Table?.Row)) {
    if (row["@_ss:Index"]) {
      rowNumber = Number(row["@_ss:Index"]);
    }

    let columnNumber = 1;
    const cells: Record<number, string> = {};

    for (const cell of asArray(row.Cell)) {
      if (cell["@_ss:Index"]) {
        columnNumber = Number(cell["@_ss:Index"]);
      }

      cells[columnNumber] = valueFromCell(cell);
      columnNumber += Number(cell["@_ss:MergeAcross"] ?? 0) + 1;
    }

    rows[rowNumber] = cells;
    rowNumber += 1;
  }

  return rows;
}

function unique(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function statusFromText(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("производ")) {
    return "in_production";
  }

  if (normalized.includes("готов")) {
    return "ready";
  }

  return "draft";
}

function findWorksheet(worksheets: SpreadsheetWorksheet[], namePart: string, fallbackIndex: number) {
  const normalizedPart = namePart.toLowerCase();
  return (
    worksheets.find((worksheet) => worksheet["@_ss:Name"]?.toLowerCase().includes(normalizedPart)) ??
    worksheets[fallbackIndex]
  );
}

function parseDictionaryRows(rows: Record<number, string>[]) {
  return {
    productCategories: unique(rows.map((row) => row?.[1])),
    materialTypes: unique(rows.map((row) => row?.[3])),
    thicknesses: unique(rows.map((row) => row?.[6])),
    millingTypes: unique(rows.map((row) => row?.[8])),
    legalTypes: unique(rows.map((row) => row?.[10]))
  };
}

function parseSpecificationLines(rows: Record<number, string>[], orderId: string): SpecificationLine[] {
  const parsedLines: SpecificationLine[] = [];
  let currentGroupId: string | null = null;

  for (let rowNumber = 18; rowNumber <= 48; rowNumber += 1) {
    const row = rows[rowNumber];
    const nonEmptyValues = Object.values(row ?? {}).filter(Boolean);

    if (!row || nonEmptyValues.length === 0) {
      parsedLines.push({
        id: `xml-row-${rowNumber}`,
        orderId,
        parentId: currentGroupId,
        lineType: "empty",
        sortOrder: rowNumber * 10,
        isCalculated: false,
        isPrinted: true,
        metadata: { importSourceRow: rowNumber }
      });
      continue;
    }

    const heightMm = toNumber(row[2]);
    const widthMm = toNumber(row[3]);
    const quantity = toNumber(row[4]);
    const description = row[5];
    const pricePerM2 = toNumber(row[10]);
    const unitAreaM2 = toNumber(row[11]);
    const totalAreaM2 = toNumber(row[12]);
    const unitPrice = toNumber(row[13]);
    const totalPrice = toNumber(row[14]);
    const hasDimensions = Boolean(heightMm && widthMm);

    if (description && !hasDimensions && !quantity && !pricePerM2 && !totalPrice) {
      const isTechnicalNote = description.toUpperCase().includes("ПРОВЕРЯЙТЕ");
      const currentGroup = currentGroupId ? parsedLines.find((line) => line.id === currentGroupId) : null;
      const isRepeatedGroup = currentGroup?.lineType === "group" && currentGroup.title === description;

      if (!isTechnicalNote && !isRepeatedGroup) {
        const line: SpecificationLine = {
          id: `xml-row-${rowNumber}`,
          orderId,
          parentId: currentGroupId,
          lineType: "group",
          sortOrder: rowNumber * 10,
          title: description,
          isCalculated: false,
          isPrinted: true,
          metadata: { importSourceRow: rowNumber }
        };

        parsedLines.push(line);
        currentGroupId = line.id;
      }

      continue;
    }

    const lineType = hasDimensions ? "product" : quantity && unitPrice ? "service" : "empty";
    const line = calculateLine({
      id: `xml-row-${rowNumber}`,
      orderId,
      parentId: currentGroupId,
      lineType,
      sortOrder: rowNumber * 10,
      title: lineType === "service" ? description : undefined,
      description: lineType === "product" ? description : undefined,
      heightMm,
      widthMm,
      quantity,
      unit: hasDimensions ? "шт" : quantity ? "шт" : undefined,
      pricePerM2,
      unitAreaM2,
      totalAreaM2,
      unitPrice,
      totalPrice,
      isCalculated: lineType === "product" || lineType === "service",
      isPrinted: true,
      metadata: { importSourceRow: rowNumber }
    });

    parsedLines.push(line);
  }

  return cleanupSpecificationLines(parsedLines);
}

function lineContent(line: SpecificationLine) {
  return [line.title, line.description].filter(Boolean).join(" ").toLowerCase();
}

function isFooterLine(line: SpecificationLine) {
  const content = lineContent(line);

  return (
    content.includes("проверяйте") ||
    content.includes("общество с ограниченной") ||
    content.includes("юридический адрес") ||
    content.includes("расчетный счет") ||
    content.includes("расчётный счет") ||
    content.includes("корр. счет") ||
    content.includes("инн") && content.includes("банк") ||
    content.includes("огрн")
  );
}

function cleanupSpecificationLines(lines: SpecificationLine[]) {
  const meaningfulLines = lines.filter((line) => line.lineType !== "empty" && !isFooterLine(line));
  const linesById = new Map(meaningfulLines.map((line) => [line.id, line]));
  const groupIdsWithItems = new Set<string>();

  for (const line of meaningfulLines) {
    if (line.lineType === "group") {
      continue;
    }

    let parentId = line.parentId;

    while (parentId) {
      const parent = linesById.get(parentId);

      if (!parent) {
        break;
      }

      groupIdsWithItems.add(parent.id);
      parentId = parent.parentId;
    }
  }

  return meaningfulLines.filter((line) => line.lineType !== "group" || groupIdsWithItems.has(line.id));
}

function parseSpreadsheetRows(
  specRows: Record<number, string>[],
  dictionaryRows: Record<number, string>[],
  worksheetNames: string[],
  source: string
): ParsedXmlPreview {
  const orderId = `import-${specRows[6]?.[7] ?? "unknown"}`.replaceAll("/", "-");
  const payments: Payment[] = [
    {
      id: `${orderId}-prepayment`,
      orderId,
      paymentType: "prepayment",
      amount: toNumber(specRows[13]?.[14]) ?? 0,
      paymentDate: toDateOnly(specRows[6]?.[9]) ?? new Date().toISOString().slice(0, 10)
    }
  ];
  const lines = parseSpecificationLines(specRows, orderId);
  const calculatedTotals = calculateOrderTotals(lines, payments);
  const documentTotal = toNumber(specRows[15]?.[14]);
  const documentArea = toNumber(specRows[15]?.[11]);

  return {
    source,
    worksheetNames,
    order: {
      specificationNumber: specRows[6]?.[7] ?? "",
      documentDate: toDateOnly(specRows[6]?.[9]) ?? "",
      customerLegalType: specRows[6]?.[11] ?? "",
      customerName: specRows[6]?.[12] ?? "",
      status: statusFromText(specRows[8]?.[12] ?? ""),
      productionStartedAt: toDateOnly(specRows[8]?.[14]),
      readyAt: toDateOnly(specRows[9]?.[14]),
      shippedAt: toDateOnly(specRows[10]?.[14]),
      category: specRows[10]?.[2],
      materialType: specRows[10]?.[4],
      thicknessMm: toNumber(specRows[10]?.[6]),
      colorCode: specRows[12]?.[3],
      jointingNote: specRows[15]?.[4],
      totalAreaM2: documentArea ?? calculatedTotals.totalAreaM2,
      totalAmount: documentTotal ?? calculatedTotals.totalAmount,
      prepaymentAmount: payments[0]?.amount ?? 0,
      balanceAmount: toNumber(specRows[12]?.[14]) ?? calculatedTotals.balanceAmount
    },
    lines,
    payments,
    dictionaries: parseDictionaryRows(dictionaryRows)
  };
}

function excelCellValueToString(value: ExcelJS.CellValue): string {
  if (value == null) {
    return "";
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  }

  if (typeof value === "object") {
    if ("result" in value) {
      return excelCellValueToString(value.result as ExcelJS.CellValue);
    }

    if ("text" in value) {
      return String(value.text ?? "").trim();
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join("").trim();
    }

    if ("hyperlink" in value && "text" in value) {
      return String(value.text ?? "").trim();
    }
  }

  return String(value).trim();
}

function readExcelJsRows(worksheet: ExcelJS.Worksheet | undefined) {
  const rows: Record<number, string>[] = [];

  worksheet?.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const cells: Record<number, string> = {};

    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cells[columnNumber] = excelCellValueToString(cell.value);
    });

    rows[rowNumber] = cells;
  });

  return rows;
}

export function parseSpreadsheetXml(xml: string, source = "spreadsheet.xml"): ParsedXmlPreview {
  const workbook = parser.parse(xml) as SpreadsheetWorkbook;
  const worksheets = asArray(workbook.Workbook.Worksheet);
  const specSheet = findWorksheet(worksheets, "спец", 0);
  const dictionarySheet = findWorksheet(worksheets, "лист1", 1);

  return parseSpreadsheetRows(
    readRows(specSheet),
    readRows(dictionarySheet),
    worksheets.map((worksheet) => worksheet["@_ss:Name"] ?? ""),
    source
  );
}

export function parseSpreadsheetXmlFile(filePath: string) {
  return parseSpreadsheetXml(readFileSync(filePath, "utf8"), filePath);
}

export async function parseSpreadsheetXlsxBuffer(buffer: Buffer, source = "spreadsheet.xlsx") {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const worksheets = workbook.worksheets;
  const specSheet =
    worksheets.find((worksheet) => worksheet.name.toLowerCase().includes("спец")) ?? worksheets[0];
  const dictionarySheet =
    worksheets.find((worksheet) => worksheet.name.toLowerCase().includes("лист1")) ?? worksheets[1];

  return parseSpreadsheetRows(
    readExcelJsRows(specSheet),
    readExcelJsRows(dictionarySheet),
    worksheets.map((worksheet) => worksheet.name),
    source
  );
}
