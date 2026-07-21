import { NextResponse } from "next/server";
import { canUsePrismaOrderStore } from "@/lib/prisma-order-store";
import { getStorageMode } from "@/lib/storage-mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const orderStore = getStorageMode();

  if (orderStore === "file") {
    return NextResponse.json({
      ok: true,
      time: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV ?? "development",
      orderStore,
      prismaAvailable: false
    });
  }

  try {
    await canUsePrismaOrderStore();

    return NextResponse.json({
      ok: true,
      time: new Date().toISOString(),
      nodeEnv: process.env.NODE_ENV ?? "development",
      orderStore,
      prismaAvailable: true
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        time: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV ?? "development",
        orderStore,
        prismaAvailable: false,
        error: "Prisma storage is unavailable"
      },
      { status: 503 }
    );
  }
}
