import { describe, expect, it } from "vitest";
import { canApplySavedSnapshot } from "@/lib/order-save-response";

describe("canApplySavedSnapshot", () => {
  it("allows the server response when the form did not change", () => {
    expect(canApplySavedSnapshot("request", "request")).toBe(true);
  });

  it("preserves newer local rows while a save is in progress", () => {
    expect(canApplySavedSnapshot("request", "request-with-new-row")).toBe(false);
  });
});
