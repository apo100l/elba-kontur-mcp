import assert from "node:assert/strict";
import test from "node:test";
import { packageVersion } from "./version.js";

test("MCP server version follows package.json", () => {
  assert.match(packageVersion, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
});
