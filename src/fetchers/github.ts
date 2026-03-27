import { fetchJson } from "../utils/http.js";
import type { PackageVersion } from "./npm.js";

export async function fetchGithubRelease(
  repo: string,
): Promise<PackageVersion> {
  try {
    const headers: Record<string, string> = {};
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const data = await fetchJson<{ tag_name: string }>(
      `https://api.github.com/repos/${repo}/releases/latest`,
      { headers },
    );

    const version = data.tag_name.replace(/^v/, "");
    return { name: repo, version };
  } catch {
    return { name: repo, version: "unknown" };
  }
}

export async function fetchGithubReleases(
  repos: string[],
): Promise<PackageVersion[]> {
  const results = await Promise.allSettled(
    repos.map((repo) => fetchGithubRelease(repo)),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: repos[i], version: "unknown" },
  );
}
