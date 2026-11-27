import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNpmVersion, fetchNpmVersions } from "../../src/fetchers/npm.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchNpmVersion", () => {
  it("reads the version from the recorded /latest response", async () => {
    mockFetch({
      "https://registry.npmjs.org/commander/latest": { body: fixture("npm-commander-latest.json") },
    });

    await expect(fetchNpmVersion("commander")).resolves.toEqual({
      name: "commander",
      version: "15.1.0",
    });
  });

  it("percent-encodes the slash in scoped package names", async () => {
    const calls = mockFetch({
      "https://registry.npmjs.org/@modelcontextprotocol%2fsdk/latest": {
        body: fixture("npm-mcp-sdk-latest.json"),
      },
    });

    const result = await fetchNpmVersion("@modelcontextprotocol/sdk");

    expect(calls.map((c) => c.url)).toEqual([
      "https://registry.npmjs.org/@modelcontextprotocol%2fsdk/latest",
    ]);
    expect(result).toEqual({ name: "@modelcontextprotocol/sdk", version: "1.32.2" });
  });

  it("returns 'unknown' on HTTP error instead of throwing", async () => {
    mockFetch({
      "https://registry.npmjs.org/no-such-pkg/latest": { body: "{}", status: 404 },
    });

    await expect(fetchNpmVersion("no-such-pkg")).resolves.toEqual({
      name: "no-such-pkg",
      version: "unknown",
    });
  });
});

describe("fetchNpmVersions", () => {
  it("keeps input order and marks failures as unknown", async () => {
    mockFetch({
      "https://registry.npmjs.org/commander/latest": { body: fixture("npm-commander-latest.json") },
      "https://registry.npmjs.org/broken/latest": new Error("socket hang up"),
    });

    await expect(fetchNpmVersions(["broken", "commander"])).resolves.toEqual([
      { name: "broken", version: "unknown" },
      { name: "commander", version: "15.1.0" },
    ]);
  });
});
