import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeImportPreview } from "@/lib/import-normalizer";
import { parseSpreadsheetXlsxBuffer } from "@/lib/xml-import";

describe("import normalizer", () => {
  it("converts xlsx preview into an order object", async () => {
    const buffer = readFileSync(path.join(process.cwd(), "docs", "124,05.xlsx"));
    const preview = await parseSpreadsheetXlsxBuffer(buffer, "124,05.xlsx");
    const order = normalizeImportPreview(preview);

    expect(order.id).toBe("import-124-05");
    expect(order.specificationNumber).toBe("124/05");
    expect(order.customer.name).toBe(preview.order.customerName);
    expect(order.lines.length).toBe(preview.lines.length);
    expect(order.totalAmount).toBeGreaterThan(0);
  });
});
