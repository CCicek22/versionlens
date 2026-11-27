import { describe, expect, it } from "vitest";
import { keepLastKnown, parseRegistryRows } from "../../scripts/registry-fallback.mjs";

const DOCKER_MD = `# Docker Image Versions

| Image | Version | Slim | Alpine | Debian |
|-------|---------|------|--------|--------|
| node | 26.13.1 | 26.13.1-slim | 26.13.1-alpine | 26.13.1-trixie |
| postgres | 19.0 | - | 19.0-alpine | 19.0-trixie |
`;

const NPM_MD = `| Package | Latest |
|---------|--------|
| react | 19.2.0 |
| zod | 4.1.0 |
`;

describe("parseRegistryRows", () => {
  it("maps first-column name to row cells, skipping header and separator", () => {
    const rows = parseRegistryRows(DOCKER_MD);
    expect(rows.has("Image")).toBe(false);
    expect(rows.get("node")).toEqual(["node", "26.13.1", "26.13.1-slim", "26.13.1-alpine", "26.13.1-trixie"]);
  });
});

describe("keepLastKnown", () => {
  it("keeps the previous version when a fetch failed", () => {
    const previous = parseRegistryRows(NPM_MD);
    const items = [{ name: "react", version: "unknown" }];

    const failed = keepLastKnown(items, previous, { version: 1 });

    expect(items[0]?.version).toBe("19.2.0");
    expect(failed).toEqual([{ name: "react", kept: true }]);
  });

  it("leaves unknown when there is no previous row", () => {
    const previous = parseRegistryRows(NPM_MD);
    const items = [{ name: "brand-new-pkg", version: "unknown" }];

    const failed = keepLastKnown(items, previous, { version: 1 });

    expect(items[0]?.version).toBe("unknown");
    expect(failed).toEqual([{ name: "brand-new-pkg", kept: false }]);
  });

  it("leaves unknown when the previous row was itself unknown", () => {
    const previous = parseRegistryRows("| Package | Latest |\n|---|---|\n| zod | unknown |\n");
    const items = [{ name: "zod", version: "unknown" }];

    const failed = keepLastKnown(items, previous, { version: 1 });

    expect(items[0]?.version).toBe("unknown");
    expect(failed).toEqual([{ name: "zod", kept: false }]);
  });

  it("does not touch an item that fetched successfully", () => {
    const previous = parseRegistryRows(NPM_MD);
    const items = [{ name: "zod", version: "4.2.0" }];

    const failed = keepLastKnown(items, previous, { version: 1 });

    expect(items[0]?.version).toBe("4.2.0");
    expect(failed).toEqual([]);
  });

  it("keeps the previous docker variant columns along with the version", () => {
    const previous = parseRegistryRows(DOCKER_MD);
    const items = [{ name: "node", version: "unknown", slim: "-", alpine: "-", debian: "-" }];

    const failed = keepLastKnown(items, previous, { version: 1, slim: 2, alpine: 3, debian: 4 });

    expect(items[0]).toEqual({
      name: "node",
      version: "26.13.1",
      slim: "26.13.1-slim",
      alpine: "26.13.1-alpine",
      debian: "26.13.1-trixie",
    });
    expect(failed).toEqual([{ name: "node", kept: true }]);
  });
});
