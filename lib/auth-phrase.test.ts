import { describe, expect, it } from "vitest";
import { isValidControlPhrase, normalizeControlPhrase } from "@/lib/auth-phrase";

describe("control phrases", () => {
  it("normalizes case and repeated whitespace", () => {
    expect(normalizeControlPhrase("  Зеленый   Лес   Дом ")).toBe("зеленый лес дом");
  });

  it("requires exactly three words", () => {
    expect(isValidControlPhrase("зеленый лес дом")).toBe(true);
    expect(isValidControlPhrase("зеленый лес")).toBe(false);
    expect(isValidControlPhrase("зеленый лес большой дом")).toBe(false);
  });
});
