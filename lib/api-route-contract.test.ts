import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const httpMethods = ["GET", "POST", "PATCH", "DELETE", "PUT", "HEAD", "OPTIONS"] as const;
type HttpMethod = (typeof httpMethods)[number];

type ApiRoute = {
  method: HttpMethod;
  path: string;
};

function walkFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const fullPath = path.join(dir, name);
    return statSync(fullPath).isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function toApiPath(routeFile: string) {
  const routePath = path
    .relative(process.cwd(), routeFile)
    .replaceAll(path.sep, "/")
    .replace(/^app\/api/, "/api")
    .replace(/\/route\.ts$/, "");

  return routePath.replace(/\[([^\]]+)\]/g, ":$1");
}

function readActualRoutes(): ApiRoute[] {
  const apiDir = path.join(process.cwd(), "app", "api");

  return walkFiles(apiDir)
    .filter((file) => file.endsWith(`${path.sep}route.ts`))
    .flatMap((file) => {
      const content = readFileSync(file, "utf8");
      const exportedMethods = [...content.matchAll(/export\s+(?:async\s+)?function\s+([A-Z]+)\b/g)]
        .map((match) => match[1])
        .filter((method): method is HttpMethod => httpMethods.includes(method as HttpMethod));

      return exportedMethods.map((method) => ({
        method,
        path: toApiPath(file)
      }));
    })
    .sort(compareRoutes);
}

function readDocumentedRoutes(): ApiRoute[] {
  const docsPath = path.join(process.cwd(), "docs", "architecture.md");
  const content = readFileSync(docsPath, "utf8");
  const apiSurface = content.match(/## API surface(?<section>[\s\S]*?)(?:\n## |\s*$)/)?.groups?.section ?? "";

  return [...apiSurface.matchAll(/^- `(GET|POST|PATCH|DELETE|PUT|HEAD|OPTIONS) ([^`]+)`$/gm)]
    .map((match) => ({
      method: match[1] as HttpMethod,
      path: match[2]
    }))
    .sort(compareRoutes);
}

function compareRoutes(first: ApiRoute, second: ApiRoute) {
  return `${first.method} ${first.path}`.localeCompare(`${second.method} ${second.path}`);
}

function formatRoutes(routes: ApiRoute[]) {
  return routes.map((route) => `${route.method} ${route.path}`);
}

describe("documented API routes", () => {
  it("keeps docs/architecture.md in sync with app/api route handlers", () => {
    expect(existsSync(path.join(process.cwd(), "docs", "architecture.md"))).toBe(true);

    expect(formatRoutes(readDocumentedRoutes())).toEqual(formatRoutes(readActualRoutes()));
  });
});
