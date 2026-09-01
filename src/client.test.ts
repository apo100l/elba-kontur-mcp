import assert from "node:assert/strict";
import test from "node:test";
import { ElbaApiError, ElbaClient } from "./client.js";

test("sends API key and query parameters", async () => {
  let request: Request | undefined;
  const client = new ElbaClient({
    apiKey: "secret",
    fetchImpl: async (input, init) => {
      request = new Request(input, init);
      return new Response(JSON.stringify([{ id: "org" }]), { status: 200 });
    },
  });

  const response = await client.request({ method: "GET", path: "/v1/organizations", query: { offset: 5, limit: 10 } });
  assert.deepEqual(response, [{ id: "org" }]);
  assert.equal(request?.headers.get("X-Kontur-ApiKey"), "secret");
  assert.equal(new URL(request!.url).search, "?offset=5&limit=10");
});

test("rejects routes absent from the OpenAPI schema", async () => {
  const client = new ElbaClient({ apiKey: "secret", fetchImpl: async () => new Response() });
  await assert.rejects(() => client.request({ method: "GET", path: "/private/admin" }), /not present/);
});

test("returns structured API errors without exposing the key", async () => {
  const client = new ElbaClient({
    apiKey: "top-secret",
    fetchImpl: async () => new Response(JSON.stringify({ message: "denied" }), { status: 403 }),
  });
  await assert.rejects(
    () => client.request({ method: "GET", path: "/v1/organizations" }),
    (error: unknown) => error instanceof ElbaApiError && error.status === 403 && !error.message.includes("top-secret"),
  );
});
