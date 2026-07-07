function firstHeaderValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

export function sameHostRedirectUrl(request: Request, path: string) {
  const requestUrl = new URL(request.url);
  const host =
    firstHeaderValue(request.headers.get("x-forwarded-host")) ??
    firstHeaderValue(request.headers.get("host"));
  const protocol = firstHeaderValue(request.headers.get("x-forwarded-proto")) ?? requestUrl.protocol.replace(":", "");

  if (!host) {
    return new URL(path, requestUrl);
  }

  return new URL(path, `${protocol || "http"}://${host}`);
}
