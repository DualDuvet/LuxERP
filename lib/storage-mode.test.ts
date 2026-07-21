import { describe, expect, it } from "vitest";
import { getStorageMode } from "@/lib/storage-mode";

describe("storage mode", () => {
  it("uses file storage by default", () => {
    expect(getStorageMode(undefined)).toBe("file");
    expect(getStorageMode("file")).toBe("file");
  });

  it("requires an explicit prisma mode", () => {
    expect(getStorageMode("prisma")).toBe("prisma");
    expect(() => getStorageMode("fallback")).toThrow(
      "Unsupported ORDER_STORE value"
    );
  });
});
