import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface DetectedPackages {
  npm: string[];
  pip: string[];
  docker: string[];
}

export async function detectPackages(dir: string): Promise<DetectedPackages> {
  const result: DetectedPackages = { npm: [], pip: [], docker: [] };

  // Detect npm packages from package.json
  try {
    const raw = await readFile(join(dir, "package.json"), "utf-8");
    const pkg = JSON.parse(raw);
    const deps = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
    };
    result.npm = Object.keys(deps).sort();
  } catch {
    // No package.json or invalid
  }

  // Detect pip packages from requirements.txt
  try {
    const raw = await readFile(join(dir, "requirements.txt"), "utf-8");
    result.pip = raw
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("-"))
      .map((line) => line.split(/[>=<!\[;]/)[0].trim())
      .filter(Boolean)
      .sort();
  } catch {
    // No requirements.txt
  }

  // Detect pip packages from pyproject.toml (basic parsing)
  if (result.pip.length === 0) {
    try {
      const raw = await readFile(join(dir, "pyproject.toml"), "utf-8");
      const depMatch = raw.match(
        /dependencies\s*=\s*\[([\s\S]*?)\]/,
      );
      if (depMatch) {
        result.pip = depMatch[1]
          .split("\n")
          .map((line) => line.trim().replace(/^["']|["'],?$/g, ""))
          .filter((line) => line && !line.startsWith("#"))
          .map((line) => line.split(/[>=<!\[;]/)[0].trim())
          .filter(Boolean)
          .sort();
      }
    } catch {
      // No pyproject.toml
    }
  }

  // Detect Docker images from Dockerfile
  try {
    const raw = await readFile(join(dir, "Dockerfile"), "utf-8");
    const fromLines = raw.match(/^FROM\s+(\S+)/gm);
    if (fromLines) {
      result.docker = fromLines
        .map((line) => {
          const image = line.replace(/^FROM\s+/, "").split(":")[0].split("@")[0];
          return image;
        })
        .filter((img) => img !== "scratch" && !img.startsWith("$"));
    }
  } catch {
    // No Dockerfile
  }

  // Detect Docker images from docker-compose.yml
  try {
    const raw = await readFile(join(dir, "docker-compose.yml"), "utf-8");
    const imageLines = raw.match(/image:\s*(\S+)/g);
    if (imageLines) {
      const images = imageLines
        .map((line) => {
          const image = line.replace(/image:\s*/, "").split(":")[0].split("@")[0];
          return image;
        })
        .filter((img) => !img.startsWith("$"));
      result.docker = [...new Set([...result.docker, ...images])];
    }
  } catch {
    // No docker-compose.yml
  }

  return result;
}
