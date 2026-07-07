export function safeNextPath(value: FormDataEntryValue | string | null | undefined) {
  const next = typeof value === "string" && value.startsWith("/") ? value : "/orders";
  return next.startsWith("//") ? "/orders" : next;
}
