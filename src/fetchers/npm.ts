import { fetchJson } from "../utils/http.js";

export interface PackageVersion {
  name: string;
  version: string;
}

export async function fetchNpmVersion(pkg: string): Promise<PackageVersion> {
  try {
    // Scoped packages need encoding: @scope/pkg → @scope%2fpkg
    const encoded = pkg.startsWith("@")
      ? pkg.replace("/", "%2f")
      : pkg;

    const data = await fetchJson<{ version: string }>(
      `https://registry.npmjs.org/${encoded}/latest`,
    );

    return { name: pkg, version: data.version };
  } catch {
    return { name: pkg, version: "unknown" };
  }
}

export async function fetchNpmVersions(
  packages: string[],
): Promise<PackageVersion[]> {
  const results = await Promise.allSettled(
    packages.map((pkg) => fetchNpmVersion(pkg)),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: packages[i], version: "unknown" },
  );
}
