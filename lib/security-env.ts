const insecureBootstrapPins = new Set([
  "000000",
  "111111",
  "123456",
  "260901",
  "654321",
  "999999"
]);

const placeholderSecrets = new Set([
  "changeme",
  "replace-me",
  "replace-with-long-random-secret",
  "your-secret-here"
]);

function readRequiredEnv(name: "AUTH_SECRET" | "AUTH_BOOTSTRAP_PIN") {
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

function assertValidBootstrapPin(pin: string) {
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("AUTH_BOOTSTRAP_PIN must contain exactly 6 digits.");
  }

  if (insecureBootstrapPins.has(pin)) {
    throw new Error("AUTH_BOOTSTRAP_PIN uses an insecure default/common value. Refusing to start.");
  }
}

let validated = false;

export function validateSecurityEnv() {
  if (validated) {
    return;
  }

  const authSecret = readRequiredEnv("AUTH_SECRET");
  const bootstrapPin = readRequiredEnv("AUTH_BOOTSTRAP_PIN");

  assertValidAuthSecret(authSecret);
  assertValidBootstrapPin(bootstrapPin);

  validated = true;
}

export function getAuthSecret() {
  validateSecurityEnv();
  return process.env.AUTH_SECRET!.trim();
}

export function getBootstrapPin() {
  validateSecurityEnv();
  return process.env.AUTH_BOOTSTRAP_PIN!.trim();
}
