import { NextResponse } from "next/server";
import { z } from "zod";
import { createManagedUser, listManagedUsers, requireApiRole, userRoles } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal("")),
  role: z.enum(userRoles),
  pin: z.string().regex(/^\d{6}$/)
});

export async function GET() {
  const auth = await requireApiRole(["admin"]);

  if (auth.response) {
    return auth.response;
  }

  return NextResponse.json({ data: await listManagedUsers() });
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["admin"]);

  if (auth.response) {
    return auth.response;
  }

  const parsed = createUserSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await createManagedUser({
      ...parsed.data,
      email: parsed.data.email || undefined
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create user" },
      { status: 400 }
    );
  }
}
