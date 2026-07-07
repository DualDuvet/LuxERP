import { NextResponse } from "next/server";
import { canUsePrismaOrderStore } from "@/lib/prisma-order-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const prismaAvailable = await canUsePrismaOrderStore();
  const requestedFileMode = process.env.ORDER_STORE === "file";

  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV ?? "development",
    orderStore: requestedFileMode ? "file" : prismaAvailable ? "prisma" : "file-fallback",
    prismaAvailable
  });
}
