export async function readJsonBody(request: Request) {
  try {
    return {
      ok: true as const,
      data: await request.json()
    };
  } catch {
    return {
      ok: false as const
    };
  }
}
