import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../mcp/server.js";

/**
 * Serve MCP over stdio. stdout carries JSON-RPC, so nothing in this
 * process may write to stdout (the logger module must not be used here).
 */
export async function mcp(dir: string): Promise<void> {
  const server = createMcpServer({ dir });
  await server.connect(new StdioServerTransport());
}
