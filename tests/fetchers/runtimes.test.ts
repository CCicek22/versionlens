import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchRuntimeVersions } from "../../src/fetchers/runtimes.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const ROUTES = {
  node: { "https://nodejs.org/dist/index.json": { body: fixture("nodejs-dist-index.json") } },
  python: { "https://endoflife.date/api/python.json": { body: fixture("eol-python.json") } },
  go: { "https://go.dev/dl/?mode=json": { body: fixture("go-dl-json.json") } },
  java: { "https://api.adoptium.net/v3/info/available_releases": { body: fixture("adoptium-available-releases.json") } },
  bun: { "https://api.github.com/repos/oven-sh/bun/releases/latest": { body: fixture("github-bun-latest.json") } },
};

describe("fetchRuntimeVersions", () => {
  it("derives the latest LTS/stable version for each supported runtime", async () => {
    mockFetch({
      ...ROUTES.node,
      ...ROUTES.python,
      ...ROUTES.go,
      ...ROUTES.java,
      ...ROUTES.bun,
    });

    const result = await fetchRuntimeVersions(["node", "python", "go", "java", "bun"]);

    expect(result).toEqual([
      { name: "Node.js", version: "26.13.1 (LTS)" },
      { name: "Python", version: "3.15.2" },
      { name: "Go", version: "1.27.4" },
      { name: "Java (OpenJDK)", version: "25 LTS" },
      { name: "Bun", version: "1.4.5" },
    ]);
  });

  it("matches runtime names case-insensitively", async () => {
    mockFetch(ROUTES.go);

    const [result] = await fetchRuntimeVersions(["GO"]);

    expect(result).toEqual({ name: "Go", version: "1.27.4" });
  });

  it("flags an unsupported runtime without fetching anything", async () => {
    const calls = mockFetch({});

    const [result] = await fetchRuntimeVersions(["cobol"]);

    expect(result).toEqual({ name: "cobol", version: "unsupported runtime" });
    expect(calls).toHaveLength(0);
  });

  it("reports 'unknown' for a runtime whose source fails, keeping the others", async () => {
    mockFetch({
      ...ROUTES.go,
      "https://nodejs.org/dist/index.json": new Error("ENOTFOUND"),
    });

    await expect(fetchRuntimeVersions(["node", "go"])).resolves.toEqual([
      { name: "node", version: "unknown" },
      { name: "Go", version: "1.27.4" },
    ]);
  });
});
