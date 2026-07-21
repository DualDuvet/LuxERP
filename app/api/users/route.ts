import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-json";
import { createManagedUser, listManagedUsers, requireApiRole, userRoles } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createUserSchema = z.object({
  username: z.string().trim().min(3).max(30),
  name: z.string().trim().min(1),
  role: z.enum(userRoles),
  phrase: z.string().min(8)
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

  const body = await readJsonBody(request);

  if (!body.ok) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await createManagedUser(parsed.data);
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to create user" },
      { status: 400 }
    );
  }
}
