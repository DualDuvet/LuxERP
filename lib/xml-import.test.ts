import { readFileSync } from "node:fs";
import path from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseSpreadsheetXlsxBuffer } from "@/lib/xml-import";

function lineText(lines: Array<{ title?: string; description?: string }>) {
  return lines.map((line) => line.title ?? line.description ?? "").join(" ");
}

describe("spreadsheet import", () => {
  it("extracts structure from xlsx workbooks", async () => {
    const workbook = new ExcelJS.Workbook();
    const spec = workbook.addWorksheet("SPEC");
    const dictionaries = workbook.addWorksheet("Dictionaries");

    spec.getCell("G6").value = "900/06";
    spec.getCell("I6").value = new Date("2026-06-09T00:00:00.000Z");
    spec.getCell("K6").value = "IP";
    spec.getCell("L6").value = "Test Customer";
    spec.getCell("L8").value = "IN PRODUCTION";
    spec.getCell("N8").value = new Date("2026-06-10T00:00:00.000Z");
    spec.getCell("N9").value = new Date("2026-06-20T00:00:00.000Z");
    spec.getCell("B10").value = "Paint";
    spec.getCell("D10").value = "Laminate";
    spec.getCell("F10").value = 22;
    spec.getCell("C12").value = "120-6";
    spec.getCell("N12").value = 11229.27065;
    spec.getCell("N13").value = 25000;
    spec.getCell("D15").value = "jointing 348-348";
    spec.getCell("K15").value = 2.84767;
    spec.getCell("N15").value = 36229.27065;
    spec.getCell("E18").value = "22mm sample";
    spec.getCell("B19").value = 1190;
    spec.getCell("C19").value = 348;
    spec.getCell("D19").value = 6;
    spec.getCell("E19").value = "4 holes by 1190";
    spec.getCell("J19").value = 13500;
    spec.getCell("N19").value = 33543.72;
    spec.getCell("D22").value = 24;
    spec.getCell("E22").value = "drilling";
    spec.getCell("M22").value = 100;
    spec.getCell("N22").value = 2400;

    dictionaries.getCell("A3").value = "Paint";
    dictionaries.getCell("C3").value = "Laminate";
    dictionaries.getCell("F3").value = 10;
    dictionaries.getCell("H3").value = "R 3";
    dictionaries.getCell("J3").value = "IP";

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const preview = await parseSpreadsheetXlsxBuffer(buffer, "test.xlsx");

    expect(preview.order.specificationNumber).toBe("900/06");
    expect(preview.order.customerName).toBe("Test Customer");
    expect(preview.lines.some((line) => line.lineType === "product")).toBe(true);
    expect(preview.lines.some((line) => line.lineType === "service")).toBe(true);
    expect(preview.lines.some((line) => line.lineType === "empty")).toBe(false);
    expect(preview.lines.some((line) => line.lineType === "comment")).toBe(false);
    expect(preview.dictionaries.materialTypes).toContain("Laminate");
  });

  it("imports real xlsx workbooks without footer rows or empty layout rows", async () => {
    const buffer = readFileSync(path.join(process.cwd(), "docs", "124,05.xlsx"));
    const preview = await parseSpreadsheetXlsxBuffer(buffer, "124,05.xlsx");
    const productLines = preview.lines.filter((line) => line.lineType === "product");
    const duplicateDescriptionLines = productLines.filter(
      (line) => line.description === productLines[0]?.description
    );
    const text = lineText(preview.lines);

    expect(preview.order.specificationNumber).toBe("124/05");
    expect(preview.order.customerName).toBe("Везувий");
    expect(productLines).toHaveLength(2);
    expect(duplicateDescriptionLines).toHaveLength(2);
    expect(productLines.map((line) => line.heightMm)).toEqual([1930, 520]);
    expect(preview.lines.some((line) => line.lineType === "empty")).toBe(false);
    expect(text).not.toContain("ИНН");
    expect(text).not.toContain("РЕМ.КОМПЛЕКТ");
  });
});
