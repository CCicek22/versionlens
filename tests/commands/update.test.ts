import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { update } from "../../src/commands/update.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

const REGISTRY = "https://raw.githubusercontent.com/CCicek22/versionlens/main/registry";
const REGISTRY_FILES = [
  "runtimes.md", "npm.md", "pip.md", "maven.md", "go.md", "rust.md", "docker.md", "tools.md", "ai-models.md",
];

let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "vlens-update-"));
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.exitCode = undefined;
});

afterEach(async () => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  process.exitCode = undefined;
  await rm(dir, { recursive: true, force: true });
});

describe("update --from-registry", () => {
  it("does not write versions.md when every registry file fails to fetch", async () => {
    mockFetch(
      Object.fromEntries(
        REGISTRY_FILES.map((f) => [`${REGISTRY}/${f}`, { body: "down", status: 503 }]),
      ),
    );

    await update(dir, { fromRegistry: true });

    expect(existsSync(join(dir, "versions.md"))).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it("does not write versions.md when the network itself throws", async () => {
    mockFetch(
      Object.fromEntries(
        REGISTRY_FILES.map((f) => [`${REGISTRY}/${f}`, new Error("ENOTFOUND")]),
      ),
    );

    await update(dir, { fromRegistry: true });

    expect(existsSync(join(dir, "versions.md"))).toBe(false);
    expect(process.exitCode).toBe(1);
  });

  it("writes the files that did fetch and skips the rest", async () => {
    const npmSection = "# npm\n\n## npm Packages\n\n| Package | Latest |\n|---|---|\n| commander | 15.1.0 |\n";
    mockFetch({
      [`${REGISTRY}/npm.md`]: { body: npmSection },
      ...Object.fromEntries(
        REGISTRY_FILES.filter((f) => f !== "npm.md").map((f) => [
          `${REGISTRY}/${f}`,
          { body: "gone", status: 404 },
        ]),
      ),
    });

    await update(dir, { fromRegistry: true });

    const out = await readFile(join(dir, "versions.md"), "utf-8");
    expect(out).toContain("# Version Reference");
    expect(out).toContain("| commander | 15.1.0 |");
    expect(out).not.toContain("# npm\n");
    expect(process.exitCode).toBeUndefined();
  });
});

describe("update (from config)", () => {
  it("fetches the configured packages and writes versions.md", async () => {
    await writeFile(join(dir, "versionlens.yaml"), "npm:\n  - commander\n", "utf-8");
    mockFetch({
      "https://registry.npmjs.org/commander/latest": { body: fixture("npm-commander-latest.json") },
    });

    await update(dir);

    const out = await readFile(join(dir, "versions.md"), "utf-8");
    expect(out).toContain("| commander | 15.1.0 |");
  });
});
