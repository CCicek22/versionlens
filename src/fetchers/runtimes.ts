import { fetchJson } from "../utils/http.js";
import type { PackageVersion } from "./npm.js";

interface NodeRelease {
  version: string;
  lts: string | false;
}

interface EndOfLifeRelease {
  cycle: string;
  latest: string;
  eol: string | boolean;
}

interface AdoptiumReleases {
  available_lts_releases: number[];
  most_recent_lts: number;
}

const RUNTIME_FETCHERS: Record<string, () => Promise<PackageVersion>> = {
  node: async () => {
    const releases = await fetchJson<NodeRelease[]>(
      "https://nodejs.org/dist/index.json",
    );
    // Find latest LTS
    const lts = releases.find((r) => r.lts !== false);
    const version = lts ? lts.version.replace(/^v/, "") : "unknown";
    return { name: "Node.js", version: `${version} (LTS)` };
  },

  python: async () => {
    const releases = await fetchJson<EndOfLifeRelease[]>(
      "https://endoflife.date/api/python.json",
    );
    // First non-EOL release is latest stable
    const stable = releases.find(
      (r) => r.eol === false || (typeof r.eol === "string" && new Date(r.eol) > new Date()),
    );
    return { name: "Python", version: stable?.latest ?? "unknown" };
  },

  bun: async () => {
    const data = await fetchJson<{ tag_name: string }>(
      "https://api.github.com/repos/oven-sh/bun/releases/latest",
      {
        headers: githubHeaders(),
      },
    );
    return { name: "Bun", version: data.tag_name.replace(/^v|^bun-v/, "") };
  },

  java: async () => {
    const data = await fetchJson<AdoptiumReleases>(
      "https://api.adoptium.net/v3/info/available_releases",
    );
    return { name: "Java (OpenJDK)", version: `${data.most_recent_lts} LTS` };
  },

  go: async () => {
    const releases = await fetchJson<{ version: string; stable: boolean }[]>(
      "https://go.dev/dl/?mode=json",
    );
    const stable = releases.find((r) => r.stable);
    const version = stable
      ? stable.version.replace(/^go/, "")
      : "unknown";
    return { name: "Go", version };
  },

  deno: async () => {
    const data = await fetchJson<{ tag_name: string }>(
      "https://api.github.com/repos/denoland/deno/releases/latest",
      {
        headers: githubHeaders(),
      },
    );
    return { name: "Deno", version: data.tag_name.replace(/^v/, "") };
  },
};

function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

export async function fetchRuntimeVersions(
  runtimes: string[],
): Promise<PackageVersion[]> {
  const results = await Promise.allSettled(
    runtimes.map(async (rt) => {
      const fetcher = RUNTIME_FETCHERS[rt.toLowerCase()];
      if (!fetcher) {
        return { name: rt, version: "unsupported runtime" };
      }
      try {
        return await fetcher();
      } catch {
        return { name: rt, version: "unknown" };
      }
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: runtimes[i], version: "unknown" },
  );
}
