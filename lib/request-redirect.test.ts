import { describe, expect, it } from "vitest";
import { sameHostRedirectUrl } from "@/lib/request-redirect";

describe("sameHostRedirectUrl", () => {
  it("uses the request Host header instead of the bind host from request.url", () => {
    const request = new Request("http://0.0.0.0:3000/api/auth/login", {
      headers: {
        host: "127.0.0.1:3000"
      }
    });

    expect(sameHostRedirectUrl(request, "/orders").toString()).toBe("http://127.0.0.1:3000/orders");
  });

  it("prefers forwarded host and protocol when present", () => {
    const request = new Request("http://0.0.0.0:3000/api/auth/login", {
      headers: {
        host: "127.0.0.1:3000",
        "x-forwarded-host": "erp.example.com",
        "x-forwarded-proto": "https"
      }
    });

    expect(sameHostRedirectUrl(request, "/orders").toString()).toBe("https://erp.example.com/orders");
  });
});
