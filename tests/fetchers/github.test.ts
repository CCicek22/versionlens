import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGithubRelease, fetchGithubReleases } from "../../src/fetchers/github.js";
import { mockFetch } from "../helpers/fetch-mock.js";

const LATEST = "https://api.github.com/repos/acme/tool/releases/latest";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("fetchGithubRelease", () => {
  it("strips a leading v from the release tag", async () => {
    mockFetch({ [LATEST]: { body: JSON.stringify({ tag_name: "v2.3.0" }) } });

    await expect(fetchGithubRelease("acme/tool")).resolves.toEqual({
      name: "acme/tool",
      version: "2.3.0",
    });
  });

  it("sends a bearer token only when GITHUB_TOKEN is set", async () => {
    vi.stubEnv("GITHUB_TOKEN", "test-token-not-real");
    const calls = mockFetch({ [LATEST]: { body: JSON.stringify({ tag_name: "1.0.0" }) } });

    await fetchGithubRelease("acme/tool");

    expect(calls[0]?.headers.Authorization).toBe("Bearer test-token-not-real");
  });

  it("sends no Authorization header without a token", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const calls = mockFetch({ [LATEST]: { body: JSON.stringify({ tag_name: "1.0.0" }) } });

    await fetchGithubRelease("acme/tool");

    expect(calls[0]?.headers.Authorization).toBeUndefined();
  });

  it("returns 'unknown' on rate limit (HTTP 403)", async () => {
    mockFetch({ [LATEST]: { body: "{}", status: 403 } });

    await expect(fetchGithubRelease("acme/tool")).resolves.toEqual({
      name: "acme/tool",
      version: "unknown",
    });
  });
});

describe("fetchGithubReleases", () => {
  it("returns one entry per repo, in order", async () => {
    mockFetch({
      [LATEST]: { body: JSON.stringify({ tag_name: "v2.3.0" }) },
      "https://api.github.com/repos/acme/other/releases/latest": new Error("timeout"),
    });

    await expect(fetchGithubReleases(["acme/tool", "acme/other"])).resolves.toEqual([
      { name: "acme/tool", version: "2.3.0" },
      { name: "acme/other", version: "unknown" },
    ]);
  });
});
