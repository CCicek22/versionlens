import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDockerVersions } from "../../src/fetchers/docker.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

const HUB_POSTGRES_17 =
  "https://hub.docker.com/v2/repositories/library/postgres/tags?page_size=20&name=";

interface HubTags {
  results: { name: string; digest: string }[];
}

describe("fetchDockerVersions", () => {
  it("uses endoflife.date for the version and Docker Hub for the tag and digest", async () => {
    // Synthetic EOL payload: the recorded 19.0 is not on Docker Hub in the fixture,
    // so this test pins postgres to 17.12, which is in the recorded Hub page.
    const eol = JSON.stringify([{ cycle: "17", latest: "17.12", eol: "2029-11-08" }]);
    const hub = fixture("docker-hub-postgres-tags-17.json");
    const bare = (JSON.parse(hub) as HubTags).results.find((t) => t.name === "17.12");
    const expectedDigest = bare!.digest.split(":")[0] + ":" + bare!.digest.split(":")[1]!.slice(0, 8);

    mockFetch({
      "https://endoflife.date/api/postgresql.json": { body: eol },
      [`${HUB_POSTGRES_17}17.12`]: { body: hub },
    });

    const [result] = await fetchDockerVersions(["postgres"]);

    expect(result).toEqual({
      name: "postgres",
      tag: "17.12 / 17.12-alpine",
      digest: expectedDigest,
    });
  });

  it("returns the EOL version without a digest when Docker Hub has no matching tag", async () => {
    // Recorded EOL data: postgres latest is 19.0, which the fixture Hub page does not list.
    mockFetch({
      "https://endoflife.date/api/postgresql.json": { body: fixture("eol-postgresql.json") },
      [`${HUB_POSTGRES_17}19.0`]: { body: fixture("docker-hub-postgres-tags-17.json") },
    });

    const [result] = await fetchDockerVersions(["postgres"]);

    expect(result).toEqual({ name: "postgres", tag: "19.0", digest: "" });
  });

  it("falls back to the Docker Hub 'latest' tag when EOL data is unavailable", async () => {
    mockFetch({
      "https://endoflife.date/api/nginx.json": new Error("404"),
      "https://hub.docker.com/v2/repositories/library/nginx/tags/latest": {
        body: JSON.stringify({ name: "latest", digest: "sha256:abcdef0123456789ff" }),
      },
    });

    const [result] = await fetchDockerVersions(["nginx"]);

    expect(result).toEqual({ name: "nginx", tag: "latest", digest: "sha256:abcdef01" });
  });

  it("reads the highest numeric tag from the MCR tag list", async () => {
    const tags = (JSON.parse(fixture("mcr-dotnet-sdk-tags.json")) as { tags: string[] }).tags;
    const versionTags = tags.filter((t) => /^\d+\.\d+(\.\d+)?$/.test(t));
    const expected = [...versionTags].sort((a, b) => {
      const pa = a.split(".").map(Number);
      const pb = b.split(".").map(Number);
      for (let i = 0; i < 3; i++) {
        const d = (pb[i] ?? 0) - (pa[i] ?? 0);
        if (d !== 0) return d;
      }
      return 0;
    })[0];

    mockFetch({
      "https://mcr.microsoft.com/v2/dotnet/sdk/tags/list": {
        body: fixture("mcr-dotnet-sdk-tags.json"),
      },
    });

    const [result] = await fetchDockerVersions(["mcr.microsoft.com/dotnet/sdk"]);

    expect(expected).toBeDefined();
    expect(result).toEqual({ name: "mcr.microsoft.com/dotnet/sdk", tag: expected, digest: "" });
  });

  it("returns 'unknown' when every source fails", async () => {
    mockFetch({});

    const [result] = await fetchDockerVersions(["ghost-image"]);

    expect(result).toEqual({ name: "ghost-image", tag: "unknown", digest: "" });
  });
});
