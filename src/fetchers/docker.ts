import { fetchJson } from "../utils/http.js";

export interface DockerImageVersion {
  name: string;
  tag: string;
  digest: string;
}

interface DockerHubTag {
  name: string;
  digest: string;
}

interface DockerHubResponse {
  results: DockerHubTag[];
}

interface EndOfLifeRelease {
  cycle: string;
  latest: string;
  eol: boolean | string;
}

function shortDigest(digest: string): string {
  if (!digest) return "";
  const parts = digest.split(":");
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1].slice(0, 8)}`;
  }
  return digest.slice(0, 14);
}

function isOfficialImage(image: string): boolean {
  return !image.includes("/") || image.startsWith("library/");
}

function isMcrImage(image: string): boolean {
  return image.startsWith("mcr.microsoft.com/");
}

// Map Docker image names to their endoflife.date product names
const EOL_PRODUCT_MAP: Record<string, string> = {
  node: "nodejs",
  python: "python",
  postgres: "postgresql",
  redis: "redis",
  nginx: "nginx",
  mongo: "mongodb",
  mysql: "mysql",
  ubuntu: "ubuntu",
  alpine: "alpine",
  golang: "go",
  ruby: "ruby",
  php: "php",
  openjdk: "java",
  mariadb: "mariadb",
  elasticsearch: "elasticsearch",
  rabbitmq: "rabbitmq",
  memcached: "memcached",
};

/**
 * Get the latest version from endoflife.date, then verify the Docker tag exists.
 */
async function fetchDockerHubTags(
  image: string,
): Promise<DockerImageVersion> {
  const repo = isOfficialImage(image) ? `library/${image}` : image;
  const baseUrl = `https://hub.docker.com/v2/repositories/${repo}/tags`;

  // Step 1: Try endoflife.date to get the real latest version
  const eolProduct = EOL_PRODUCT_MAP[image] ?? image;
  let latestVersion = "";

  try {
    const releases = await fetchJson<EndOfLifeRelease[]>(
      `https://endoflife.date/api/${eolProduct}.json`,
    );
    // Pick the first non-EOL release
    const active = releases.find(
      (r) =>
        r.eol === false ||
        (typeof r.eol === "string" && new Date(r.eol) > new Date()),
    );
    if (active) {
      latestVersion = active.latest;
    }
  } catch {
    // endoflife.date doesn't have this product
  }

  // Step 2: If we got a version, verify the tag exists on Docker Hub
  if (latestVersion) {
    try {
      const data = await fetchJson<DockerHubResponse>(
        `${baseUrl}?page_size=20&name=${latestVersion}`,
      );

      const bareTag = data.results.find((t) => t.name === latestVersion);
      const slimTag = data.results.find(
        (t) => t.name === `${latestVersion}-slim`,
      );
      const alpineTag = data.results.find(
        (t) => t.name === `${latestVersion}-alpine`,
      );

      const variant = slimTag ?? alpineTag;

      if (bareTag || variant) {
        const mainTag = bareTag ?? variant!;
        return {
          name: image,
          tag: variant && bareTag
            ? `${latestVersion} / ${variant.name}`
            : (bareTag?.name ?? variant!.name),
          digest: shortDigest(mainTag.digest),
        };
      }
    } catch {
      // Tag search failed, fall through
    }

    // Tag exists in endoflife.date but not as exact match on Docker Hub.
    // Some images use different tag formats (e.g., postgres uses "17.4" not "17.4.0").
    // Try with just major.minor
    const majorMinor = latestVersion.split(".").slice(0, 2).join(".");
    if (majorMinor !== latestVersion) {
      try {
        const data = await fetchJson<DockerHubResponse>(
          `${baseUrl}?page_size=20&name=${majorMinor}`,
        );

        const bareTag = data.results.find((t) => t.name === majorMinor);
        const slimTag = data.results.find(
          (t) => t.name === `${majorMinor}-slim`,
        );
        const alpineTag = data.results.find(
          (t) => t.name === `${majorMinor}-alpine`,
        );

        const variant = slimTag ?? alpineTag;

        if (bareTag || variant) {
          const mainTag = bareTag ?? variant!;
          return {
            name: image,
            tag: variant && bareTag
              ? `${majorMinor} / ${variant.name}`
              : (bareTag?.name ?? variant!.name),
            digest: shortDigest(mainTag.digest),
          };
        }
      } catch {
        // Fall through
      }
    }

    // Return what endoflife.date says even without Docker Hub verification
    return {
      name: image,
      tag: latestVersion,
      digest: "",
    };
  }

  // Step 3: Fallback — get latest tag digest from Docker Hub
  try {
    const latestTag = await fetchJson<DockerHubTag>(`${baseUrl}/latest`);
    return {
      name: image,
      tag: "latest",
      digest: shortDigest(latestTag.digest ?? ""),
    };
  } catch {
    return { name: image, tag: "unknown", digest: "" };
  }
}

async function fetchMcrTags(image: string): Promise<DockerImageVersion> {
  const path = image.replace("mcr.microsoft.com/", "");

  const data = await fetchJson<{ tags: string[] }>(
    `https://mcr.microsoft.com/v2/${path}/tags/list`,
  );

  const versionTags = data.tags.filter((t) => /^\d+\.\d+(\.\d+)?$/.test(t));
  const sorted = [...versionTags].sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  return {
    name: image,
    tag: sorted[0] ?? "latest",
    digest: "",
  };
}

export async function fetchDockerVersions(
  images: string[],
): Promise<DockerImageVersion[]> {
  const results = await Promise.allSettled(
    images.map(async (image) => {
      try {
        if (isMcrImage(image)) {
          return await fetchMcrTags(image);
        }
        return await fetchDockerHubTags(image);
      } catch {
        return { name: image, tag: "unknown", digest: "" };
      }
    }),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : { name: images[i], tag: "unknown", digest: "" },
  );
}
