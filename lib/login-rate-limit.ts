type LoginAttemptState = {
  failures: number;
  resetAt: number;
  blockedUntil?: number;
};

const windowMs = 10 * 60 * 1000;
const blockMs = 15 * 60 * 1000;
const maxFailures = 5;
const attempts = new Map<string, LoginAttemptState>();

export function loginRateLimitKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip")?.trim() || "local";
}

export function checkLoginRateLimit(key: string, now = Date.now()) {
  const state = attempts.get(key);

  if (!state) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (state.blockedUntil && state.blockedUntil > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000)
    };
  }

  if (state.resetAt <= now) {
    attempts.delete(key);
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

export function recordLoginFailure(key: string, now = Date.now()) {
  const current = attempts.get(key);
  const state =
    current && current.resetAt > now
      ? current
      : {
          failures: 0,
          resetAt: now + windowMs
        };

  state.failures += 1;

  if (state.failures >= maxFailures) {
    state.blockedUntil = now + blockMs;
  }

  attempts.set(key, state);
}

export function clearLoginFailures(key: string) {
  attempts.delete(key);
}
