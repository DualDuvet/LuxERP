import { readAuthSecretEnv } from "@/lib/security-env";
import type { UserRole } from "@/lib/types";

const userRoles = ["admin", "manager", "production", "accountant", "viewer"] as const;

type SessionPayload = {
  user?: {
    role?: UserRole;
  };
  expiresAt?: number;
};

function base64UrlToBase64(value: string) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  return base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
}

function base64ToBase64Url(value: string) {
  return value.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return base64ToBase64Url(btoa(binary));
}

function decodeBase64Url(value: string) {
  const binary = atob(base64UrlToBase64(value));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function sign(value: string) {
  return crypto.subtle
    .importKey("raw", new TextEncoder().encode(readAuthSecretEnv()), { name: "HMAC", hash: "SHA-256" }, false, [
      "sign"
    ])
    .then((key) => crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)))
    .then((signature) => bytesToBase64Url(new Uint8Array(signature)));
}

function safeEqual(first: string, second: string) {
  if (first.length !== second.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < first.length; index += 1) {
    mismatch |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }

  return mismatch === 0;
}

export async function isValidSessionToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || !safeEqual(signature, await sign(payload))) {
    return false;
  }

  try {
    const session = JSON.parse(decodeBase64Url(payload)) as SessionPayload;

    if (!session.user || !session.expiresAt || session.expiresAt < Date.now()) {
      return false;
    }

    return userRoles.includes(session.user.role as UserRole);
  } catch {
    return false;
  }
}
