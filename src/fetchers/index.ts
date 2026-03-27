import type { Config } from "../config/schema.js";
import { fetchNpmVersions, type PackageVersion } from "./npm.js";
import { fetchPypiVersions } from "./pypi.js";
import { fetchRuntimeVersions } from "./runtimes.js";
import { fetchDockerVersions, type DockerImageVersion } from "./docker.js";
import { fetchGithubReleases } from "./github.js";
import { fetchAiModels, type AiModelInfo } from "./ai-models.js";

export interface FetchResult {
  timestamp: string;
  runtimes: PackageVersion[];
  npm: PackageVersion[];
  pip: PackageVersion[];
  docker: DockerImageVersion[];
  github: PackageVersion[];
  ai_models: AiModelInfo[];
}

export async function fetchAll(config: Config): Promise<FetchResult> {
  const [runtimes, npm, pip, docker, github, ai_models] =
    await Promise.all([
      config.runtimes.length
        ? fetchRuntimeVersions(config.runtimes)
        : Promise.resolve([]),
      config.npm.length
        ? fetchNpmVersions(config.npm)
        : Promise.resolve([]),
      config.pip.length
        ? fetchPypiVersions(config.pip)
        : Promise.resolve([]),
      config.docker.length
        ? fetchDockerVersions(config.docker)
        : Promise.resolve([]),
      config.github.length
        ? fetchGithubReleases(config.github)
        : Promise.resolve([]),
      config.ai_models.length
        ? fetchAiModels(config.ai_models)
        : Promise.resolve([]),
    ]);

  return {
    timestamp: new Date().toISOString(),
    runtimes,
    npm,
    pip,
    docker,
    github,
    ai_models,
  };
}

export type { PackageVersion, DockerImageVersion, AiModelInfo };
