import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { findCustomers } from "@/lib/customer-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireApiUser();

  if (auth.response) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "";
  const customers = await findCustomers(query, 8);

  return NextResponse.json({ data: customers });
}
