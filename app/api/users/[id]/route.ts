import { NextResponse } from "next/server";
import { z } from "zod";
import { readJsonBody } from "@/lib/api-json";
import { requireApiRole, updateManagedUser, userRoles } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateUserSchema = z.object({
  username: z.string().trim().min(3).max(30).optional(),
  name: z.string().trim().min(1).optional(),
  role: z.enum(userRoles).optional(),
  isActive: z.boolean().optional(),
  phrase: z.string().min(8).optional().or(z.literal(""))
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole(["admin"]);

  if (auth.response) {
    return auth.response;
  }

  const { id } = await params;
  const body = await readJsonBody(request);

  if (!body.ok) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body.data);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid user payload", details: parsed.error.flatten() }, { status: 400 });
  }

  if (id === auth.user.id && parsed.data.isActive === false) {
    return NextResponse.json({ error: "Cannot deactivate current user" }, { status: 400 });
  }

  try {
    const user = await updateManagedUser(id, {
      ...parsed.data,
      phrase: parsed.data.phrase || undefined
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update user" },
      { status: 400 }
    );
  }
}
