import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";
import { authPrisma } from "./auth-prisma";
import { readAuthSecretEnv } from "./security-env";

export const auth = betterAuth({
  database: prismaAdapter(authPrisma, {
    provider: "sqlite"
  }),
  secret: readAuthSecretEnv(),
  baseURL:
    process.env.BETTER_AUTH_URL ??
    process.env.PUBLIC_APP_URL ??
    "http://localhost:3000",
  basePath: "/api/auth",
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: 8
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "viewer",
        input: false
      },
      isActive: {
        type: "boolean",
        required: true,
        defaultValue: true,
        input: false
      }
    }
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameNormalization: (value) => value.trim().toLowerCase(),
      usernameValidator: (value) => /^[a-z0-9][a-z0-9._-]{2,29}$/i.test(value)
    })
  ],
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 600,
    max: 5,
    customRules: {
      "/sign-in/username": {
        window: 600,
        max: 5
      }
    }
  }
});
