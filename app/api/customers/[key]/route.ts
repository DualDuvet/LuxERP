import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth";
import { decodeCustomerKey } from "@/lib/customer-summary";
import { updateCustomerContacts } from "@/lib/customer-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emptyStringToUndefined = (value: unknown) => (value === "" || value == null ? undefined : value);
const optionalText = z.preprocess(emptyStringToUndefined, z.string().trim().optional());

const customerContactSchema = z.object({
  phone: optionalText,
  email: z.preprocess(emptyStringToUndefined, z.string().trim().email().optional()),
  inn: optionalText,
  address: optionalText,
  comment: optionalText
});

export async function PATCH(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const auth = await requireApiRole(["admin", "manager"]);

  if (auth.response) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const parsed = customerContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid customer contact payload", details: parsed.error.flatten() }, { status: 400 });
  }

  const { key } = await params;
  const data = await updateCustomerContacts(decodeCustomerKey(key), parsed.data);

  if (!data) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
