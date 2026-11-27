import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMcpServer } from "../../src/mcp/server.js";
import { fixture, mockFetch } from "../helpers/fetch-mock.js";

const COMMANDER = "https://registry.npmjs.org/commander/latest";

let dir: string;
let client: Client;

/** Connect a client to a fresh server over the SDK's linked in-memory transport. */
async function connect(cwd: string): Promise<void> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await createMcpServer({ dir: cwd }).connect(serverTransport);
  client = new Client({ name: "versionlens-test", version: "0.0.0" });
  await client.connect(clientTransport);
}

/** Return the text of the first content block, failing the test if it is not text. */
function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const block = result.content[0];
  if (block?.type !== "text") throw new Error(`expected text content, got ${block?.type}`);
  return block.text;
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "vlens-mcp-"));
});

afterEach(async () => {
  await client?.close();
  vi.unstubAllGlobals();
  await rm(dir, { recursive: true, force: true });
});

describe("versionlens MCP server", () => {
  it("advertises get_latest_version and list_tracked with their input schema", async () => {
    await connect(dir);

    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    const latest = tools.find((t) => t.name === "get_latest_version");

    expect(names).toEqual(["get_latest_version", "list_tracked"]);
    expect(latest?.inputSchema.required).toEqual(["ecosystem", "name"]);
    expect(latest?.inputSchema.properties).toMatchObject({
      ecosystem: { enum: ["npm", "pip", "github"] },
    });
  });

  it("get_latest_version returns the live version and source URL", async () => {
    const calls = mockFetch({ [COMMANDER]: { body: fixture("npm-commander-latest.json") } });
    await connect(dir);

    const result = await client.callTool({
      name: "get_latest_version",
      arguments: { ecosystem: "npm", name: "commander" },
    });

    expect(result.isError).toBeFalsy();
    expect(calls.map((c) => c.url)).toEqual([COMMANDER]);
    expect(JSON.parse(textOf(result))).toEqual({
      ecosystem: "npm",
      name: "commander",
      version: "15.1.0",
      source: "https://www.npmjs.com/package/commander",
    });
  });

  it("get_latest_version rejects a name that would alter the request URL, without fetching", async () => {
    const calls = mockFetch({});
    await connect(dir);

    const result = await client.callTool({
      name: "get_latest_version",
      arguments: { ecosystem: "pip", name: "../../evil" },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/Invalid pip name/);
    expect(calls).toHaveLength(0);
  });

  it("get_latest_version reports an error when the registry lookup fails", async () => {
    mockFetch({ [COMMANDER]: new Error("ECONNRESET") });
    await connect(dir);

    const result = await client.callTool({
      name: "get_latest_version",
      arguments: { ecosystem: "npm", name: "commander" },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/Could not fetch/);
  });

  it("list_tracked returns the tracked items with their current versions", async () => {
    await writeFile(join(dir, "versionlens.yaml"), "npm:\n  - commander\n", "utf-8");
    mockFetch({ [COMMANDER]: { body: fixture("npm-commander-latest.json") } });
    await connect(dir);

    const result = await client.callTool({ name: "list_tracked", arguments: {} });
    const body = JSON.parse(textOf(result)) as { tracked: { npm: unknown[]; pip: unknown[] } };

    expect(result.isError).toBeFalsy();
    expect(body.tracked.npm).toEqual([{ name: "commander", version: "15.1.0" }]);
    expect(body.tracked.pip).toEqual([]);
  });

  it("list_tracked returns an error result when versionlens.yaml is missing", async () => {
    await connect(dir);

    const result = await client.callTool({ name: "list_tracked", arguments: {} });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/versionlens init/);
  });
});
