import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { requireApiUser } from "@/lib/auth";
import { getOrderById } from "@/lib/order-store";
import type { Order } from "@/lib/types";
import { renderPrintHtml } from "@/lib/order-print-html";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let activePdfGenerations = 0;
const maxConcurrentPdfGenerations = 1;

function pdfFileName(specificationNumber: string) {
  const safeNumber = specificationNumber.replaceAll(/[^\p{L}\p{N}._-]+/gu, "-").replaceAll(/^-|-$/g, "");
  return `specification-${safeNumber || "order"}.pdf`;
}

function renderPdfHtml(order: Order) {
  const htmlPromise = renderPrintHtml(order);

  return htmlPromise.then((html) => {
    try {
      const logo = readFileSync(join(process.cwd(), "public", "print-logo.png")).toString("base64");
      return html.replaceAll('src="/print-logo.png"', `src="data:image/png;base64,${logo}"`);
    } catch {
      return html;
    }
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (activePdfGenerations >= maxConcurrentPdfGenerations) {
    return NextResponse.json(
      { error: "PDF generation is busy. Try again shortly." },
      { status: 429, headers: { "Retry-After": "30" } }
    );
  }

  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    activePdfGenerations += 1;
    browser = await chromium.launch({
      args: ["--no-sandbox", "--disable-dev-shm-usage"]
    });

    const page = await browser.newPage({
      viewport: {
        width: 794,
        height: 1123
      }
    });

    await page.setContent(await renderPdfHtml(order), {
      waitUntil: "networkidle"
    });
    await page.emulateMedia({ media: "print" });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "8mm",
        right: "8mm",
        bottom: "8mm",
        left: "8mm"
      }
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${pdfFileName(order.specificationNumber)}"`
      }
    });
  } catch (error) {
    console.error("Failed to render order PDF", error);

    return NextResponse.json(
      {
        error: "PDF generation failed",
        hint: "Install Playwright browsers with `npx playwright install chromium`."
      },
      { status: 500 }
    );
  } finally {
    await browser?.close();
    activePdfGenerations = Math.max(0, activePdfGenerations - 1);
  }
}
