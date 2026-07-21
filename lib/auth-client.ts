"use client";

import { createAuthClient } from "better-auth/react";
import { usernameClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window === "undefined"
      ? "http://localhost:3000/api/auth"
      : `${window.location.origin}/api/auth`,
  plugins: [usernameClient()]
});
