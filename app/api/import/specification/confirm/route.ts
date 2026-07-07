import { NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireApiRole } from "@/lib/auth";
import { normalizeImportPreview } from "@/lib/import-normalizer";
import { saveOrder } from "@/lib/order-store";
import type { ParsedXmlPreview } from "@/lib/xml-import";

export const runtime = "nodejs";

function makeFileName(specificationNumber: string) {
  const safeName = specificationNumber
    .replaceAll("/", "-")
    .replaceAll("\\", "-")
    .replace(/[^a-zа-я0-9-]/gi, "");

  return `${safeName || "import"}-${Date.now()}.json`;
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const body = (await request.json()) as { preview?: ParsedXmlPreview };

  if (!body.preview) {
    return NextResponse.json({ error: "Preview data is required." }, { status: 400 });
  }

  const order = normalizeImportPreview(body.preview);
  const importsDir = path.join(process.cwd(), ".data", "imports");
  const fileName = makeFileName(order.specificationNumber);
  const filePath = path.join(importsDir, fileName);
  const orderFilePath = await saveOrder(order);

  await mkdir(importsDir, { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(
      {
        importedAt: new Date().toISOString(),
        source: body.preview.source,
        order
      },
      null,
      2
    ),
    "utf8"
  );

  return NextResponse.json({
    data: {
      order,
      savedTo: path.relative(process.cwd(), filePath),
      orderSavedTo: path.relative(process.cwd(), orderFilePath),
      message: "Импорт подтверждён и сохранён как JSON-артефакт."
    }
  });
}
