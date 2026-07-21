import { isValidControlPhrase } from "@/lib/auth-phrase";

const placeholderSecrets = new Set([
  "changeme",
  "replace-me",
  "replace-with-long-random-secret",
  "your-secret-here"
]);

function readRequiredEnv(name: "AUTH_SECRET" | "AUTH_BOOTSTRAP_USERNAME" | "AUTH_BOOTSTRAP_PHRASE") {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required. Refusing to start without it.`);
  }

  return value;
}

export function readAuthSecretEnv() {
  return readRequiredEnv("AUTH_SECRET");
}

function assertValidAuthSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters long.");
  }

  if (placeholderSecrets.has(secret.toLowerCase())) {
    throw new Error("AUTH_SECRET uses a placeholder value. Refusing to start.");
  }
}

function assertValidBootstrapUsername(username: string) {
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/i.test(username)) {
    throw new Error("AUTH_BOOTSTRAP_USERNAME must contain 3-30 Latin letters, digits, dots, underscores or hyphens.");
  }
}

function assertValidBootstrapPhrase(phrase: string) {
  if (!isValidControlPhrase(phrase)) {
    throw new Error("AUTH_BOOTSTRAP_PHRASE must contain exactly three words.");
  }

  if (phrase.trim().toLowerCase() === "word-one word-two word-three") {
    throw new Error("AUTH_BOOTSTRAP_PHRASE uses the example value. Refusing to start.");
  }
}

let validated = false;

export function validateSecurityEnv() {
  if (validated) {
    return;
  }

  const authSecret = readRequiredEnv("AUTH_SECRET");
  const bootstrapUsername = readRequiredEnv("AUTH_BOOTSTRAP_USERNAME");
  const bootstrapPhrase = readRequiredEnv("AUTH_BOOTSTRAP_PHRASE");

  assertValidAuthSecret(authSecret);
  assertValidBootstrapUsername(bootstrapUsername);
  assertValidBootstrapPhrase(bootstrapPhrase);

  validated = true;
}

export function getAuthSecret() {
  validateSecurityEnv();
  return process.env.AUTH_SECRET!.trim();
}

export function getBootstrapUsername() {
  validateSecurityEnv();
  return process.env.AUTH_BOOTSTRAP_USERNAME!.trim().toLowerCase();
}

export function getBootstrapPhrase() {
  validateSecurityEnv();
  return process.env.AUTH_BOOTSTRAP_PHRASE!.trim();
}
