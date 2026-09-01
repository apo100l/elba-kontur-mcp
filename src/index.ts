#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ElbaClient } from "./client.js";
import { createServer } from "./server.js";

const apiKey = process.env.ELBA_API_KEY;
if (!apiKey) {
  console.error("ELBA_API_KEY is required. See README.md for setup instructions.");
  process.exit(1);
}

const timeoutMs = Number(process.env.ELBA_API_TIMEOUT_MS ?? "30000");
if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("ELBA_API_TIMEOUT_MS must be a positive number.");
  process.exit(1);
}

const client = new ElbaClient({
  apiKey,
  baseUrl: process.env.ELBA_API_BASE_URL,
  timeoutMs,
});
const server = createServer(client);
const transport = new StdioServerTransport();

await server.connect(transport);
