import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { configExists, loadConfig } from "../config/loader.js";
import { fetchGithubRelease } from "../fetchers/github.js";
import { fetchAll } from "../fetchers/index.js";
import { fetchNpmVersion } from "../fetchers/npm.js";
import { fetchPypiVersion } from "../fetchers/pypi.js";
import type { PackageVersion } from "../fetchers/npm.js";

interface Ecosystem {
  /** Names are interpolated into URLs by the fetchers, so they must be validated first. */
  pattern: RegExp;
  fetch: (name: string) => Promise<PackageVersion>;
  source: (name: string) => string;
}

const ECOSYSTEMS = {
  npm: {
    pattern: /^(@[a-z0-9~][a-z0-9._~-]*\/)?[a-z0-9~][a-z0-9._~-]*$/,
    fetch: fetchNpmVersion,
    source: (name) => `https://www.npmjs.com/package/${name}`,
  },
  pip: {
    pattern: /^[A-Za-z0-9][A-Za-z0-9._-]*$/,
    fetch: fetchPypiVersion,
    source: (name) => `https://pypi.org/project/${name}/`,
  },
  github: {
    pattern: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
    fetch: fetchGithubRelease,
    source: (name) => `https://github.com/${name}/releases/latest`,
  },
} satisfies Record<string, Ecosystem>;

type EcosystemName = keyof typeof ECOSYSTEMS;

function textResult(payload: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
}

function errorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

export interface McpOptions {
  /** Directory that holds versionlens.yaml. */
  dir: string;
}

/**
 * Build the versionlens MCP server. Transport is attached by the caller,
 * so tests can use the SDK's in-memory transport and the CLI uses stdio.
 */
export function createMcpServer({ dir }: McpOptions): McpServer {
  const server = new McpServer({ name: "versionlens", version: "1.0.0" });

  server.registerTool(
    "get_latest_version",
    {
      title: "Get latest package version",
      description:
        "Look up the latest published version of a package from its public registry (live). " +
        "Use this before suggesting a dependency version.",
      inputSchema: {
        ecosystem: z.enum(Object.keys(ECOSYSTEMS) as [EcosystemName, ...EcosystemName[]]),
        name: z
          .string()
          .min(1)
          .max(214)
          .describe("npm/pip package name, or GitHub repo as owner/repo"),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ ecosystem, name }) => {
      const eco = ECOSYSTEMS[ecosystem];
      if (!eco.pattern.test(name)) {
        return errorResult(`Invalid ${ecosystem} name: ${name}`);
      }

      const { version } = await eco.fetch(name);
      if (version === "unknown") {
        return errorResult(`Could not fetch the latest ${ecosystem} version of ${name}`);
      }

      return textResult({ ecosystem, name, version, source: eco.source(name) });
    },
  );

  server.registerTool(
    "list_tracked",
    {
      title: "List tracked versions",
      description:
        "List what the project's versionlens.yaml tracks, with the current latest version " +
        "of each item (live lookup).",
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async () => {
      let config;
      try {
        config = await loadConfig(dir);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        return errorResult(`Cannot read ${configExists(dir)}: ${reason}. Run "versionlens init" first.`);
      }

      const data = await fetchAll(config);
      return textResult({
        config: configExists(dir),
        tracked: {
          runtimes: data.runtimes,
          npm: data.npm,
          pip: data.pip,
          docker: data.docker,
          github: data.github,
          ai_models: data.ai_models,
        },
      });
    },
  );

  return server;
}
