import { fetchJson } from "../utils/http.js";
import type { PackageVersion } from "./npm.js";

export async function fetchPypiVersion(pkg: string): Promise<PackageVersion> {
  try {
    const data = await fetchJson<{ info: { version: string } }>(
      `https://pypi.org/pypi/${pkg}/json`,
    );

    return { name: pkg, version: data.info.version };
  } catch {
    return { name: pkg, version: "unknown" };
  }
}

export async function fetchPypiVersions(
  packages: string[],
): Promise<PackageVersion[]> {
  const results = await Promise.allSettled(
    packages.map((pkg) => fetchPypiVersion(pkg)),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: packages[i], version: "unknown" },
  );
}
