import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPypiVersion, fetchPypiVersions } from "../../src/fetchers/pypi.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchPypiVersion", () => {
  it("reads info.version from the recorded PyPI JSON", async () => {
    mockFetch({
      "https://pypi.org/pypi/six/json": { body: fixture("pypi-six.json") },
    });

    await expect(fetchPypiVersion("six")).resolves.toEqual({ name: "six", version: "1.17.0" });
  });

  it("returns 'unknown' when the package does not exist", async () => {
    mockFetch({
      "https://pypi.org/pypi/nope-nope/json": { body: "Not Found", status: 404 },
    });

    await expect(fetchPypiVersion("nope-nope")).resolves.toEqual({
      name: "nope-nope",
      version: "unknown",
    });
  });
});

describe("fetchPypiVersions", () => {
  it("maps a rejected lookup to 'unknown' and keeps the others", async () => {
    mockFetch({
      "https://pypi.org/pypi/six/json": { body: fixture("pypi-six.json") },
      "https://pypi.org/pypi/down/json": new Error("ECONNRESET"),
    });

    await expect(fetchPypiVersions(["six", "down"])).resolves.toEqual([
      { name: "six", version: "1.17.0" },
      { name: "down", version: "unknown" },
    ]);
  });
});
