import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ElbaApiError, ElbaClient } from "./client.js";
import { findOperation, operationDetails, operations } from "./spec.js";
import type { HttpMethod } from "./types.js";

const jsonObject = z.record(z.string(), z.unknown());

function result(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: { result: data },
  };
}

function errorResult(error: unknown) {
  const data = error instanceof ElbaApiError
    ? { error: error.message, status: error.status, details: error.details }
    : { error: error instanceof Error ? error.message : String(error) };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
    isError: true,
  };
}

export function createServer(client: ElbaClient): McpServer {
  const server = new McpServer(
    { name: "elba-kontur-mcp", version: "1.0.0" },
    { instructions: "Use these tools to work with the Kontur.Elba Public API. Inspect an operation before calling it when its request body is unclear." },
  );

  server.registerTool(
    "elba_list_operations",
    {
      title: "Список операций Эльбы",
      description: "Показывает доступные методы и маршруты Elba Public API из встроенной OpenAPI-схемы.",
      inputSchema: {
        search: z.string().optional().describe("Необязательный поиск по маршруту или описанию"),
      },
    },
    async ({ search }) => {
      const needle = search?.toLocaleLowerCase("ru");
      const items = operations
        .filter((operation) => !needle || `${operation.method} ${operation.path} ${operation.summary}`.toLocaleLowerCase("ru").includes(needle))
        .map(({ method, path, summary }) => ({ method, path, summary }));
      return result(items);
    },
  );

  server.registerTool(
    "elba_describe_operation",
    {
      title: "Описание операции Эльбы",
      description: "Возвращает параметры, тело запроса и ответы конкретной операции из OpenAPI-схемы.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "DELETE"]),
        path: z.string().startsWith("/").describe("Фактический путь или шаблон, например /v1/organizations"),
      },
    },
    async ({ method, path }) => {
      const operation = findOperation(method, path) ?? operations.find((item) => item.method === method && item.path === path);
      return operation ? result(operationDetails(operation)) : errorResult(new Error(`Unknown operation: ${method} ${path}`));
    },
  );

  server.registerTool(
    "elba_list_organizations",
    {
      title: "Организации Эльбы",
      description: "Получает список организаций, доступных по настроенному API-ключу.",
      inputSchema: {
        offset: z.number().int().min(0).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async ({ offset, limit }) => {
      try {
        return result(await client.request({ method: "GET", path: "/v1/organizations", query: { offset, limit } }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  server.registerTool(
    "elba_request",
    {
      title: "Запрос к Elba Public API",
      description: "Выполняет операцию, только если сочетание метода и пути разрешено встроенной OpenAPI-схемой. Для изменяющих операций сначала изучите схему через elba_describe_operation.",
      inputSchema: {
        method: z.enum(["GET", "POST", "PUT", "DELETE"]),
        path: z.string().startsWith("/").describe("Фактический путь с подставленными идентификаторами, например /v1/organizations/{id}/bills"),
        query: jsonObject.optional().describe("Query-параметры"),
        body: z.unknown().optional().describe("JSON-тело запроса"),
      },
    },
    async ({ method, path, query, body }) => {
      try {
        return result(await client.request({ method: method as HttpMethod, path, query: query as Record<string, string | number | boolean | null | undefined>, body }));
      } catch (error) {
        return errorResult(error);
      }
    },
  );

  return server;
}
