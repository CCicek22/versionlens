import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { vi } from "vitest";

const FIXTURE_DIR = fileURLToPath(new URL("../fixtures/", import.meta.url));

/** Read a recorded registry response from tests/fixtures/. */
export function fixture(name: string): string {
  return readFileSync(`${FIXTURE_DIR}${name}`, "utf-8");
}

export interface MockResponse {
  body: string;
  status?: number;
}

export interface FetchCall {
  url: string;
  headers: Record<string, string>;
}

/**
 * Replace global fetch with a router keyed by exact URL.
 * Unmocked URLs throw, so a test can never reach the network by accident.
 * Call vi.unstubAllGlobals() in afterEach.
 */
export function mockFetch(routes: Record<string, MockResponse | Error>): FetchCall[] {
  const calls: FetchCall[] = [];

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url;
      const headers = Object.fromEntries(
        Object.entries((init?.headers ?? {}) as Record<string, string>),
      );
      calls.push({ url, headers });

      const route = routes[url];
      if (route === undefined) throw new TypeError(`unmocked fetch: ${url}`);
      if (route instanceof Error) throw route;
      return new Response(route.body, { status: route.status ?? 200 });
    }),
  );

  return calls;
}
