import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/auth";
import {
  parseSpreadsheetXlsxBuffer,
  parseSpreadsheetXml
} from "@/lib/xml-import";

export const runtime = "nodejs";

const maxUploadBytes = 8 * 1024 * 1024;

export async function GET() {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ data: null });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не найден в поле file." }, { status: 400 });
  }

  if (file.size > maxUploadBytes) {
    return NextResponse.json({ error: "Uploaded file is too large. Maximum size is 8 MB." }, { status: 413 });
  }

  const fileName = file.name || "uploaded.xml";
  const lowerFileName = fileName.toLowerCase();
  const isXmlLike =
    fileName.toLowerCase().endsWith(".xml") ||
    file.type === "application/xml" ||
    file.type === "text/xml" ||
    file.type === "";
  const isXlsx = lowerFileName.endsWith(".xlsx");

  if (!isXmlLike && !isXlsx) {
    return NextResponse.json(
      {
        error: "Поддерживаются Excel XML / SpreadsheetML (.xml) и Excel Workbook (.xlsx)."
      },
      { status: 415 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const preview = isXlsx
      ? await parseSpreadsheetXlsxBuffer(buffer, fileName)
      : parseSpreadsheetXml(buffer.toString("utf8"), fileName);

    return NextResponse.json({ data: preview });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Не удалось разобрать Excel файл."
      },
      { status: 422 }
    );
  }
}
