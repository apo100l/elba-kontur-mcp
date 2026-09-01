import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ApiOperation, HttpMethod, OpenApiDocument } from "./types.js";

const specUrl = new URL("../openapi.json", import.meta.url);
export const spec = JSON.parse(readFileSync(fileURLToPath(specUrl), "utf8")) as OpenApiDocument;

const methods = new Set(["get", "post", "put", "delete"]);

export const operations: ApiOperation[] = Object.entries(spec.paths).flatMap(([path, pathItem]) =>
  Object.entries(pathItem)
    .filter(([method]) => methods.has(method))
    .map(([method, operation]) => ({
      method: method.toUpperCase() as HttpMethod,
      path,
      summary: operation.summary ?? "",
      description: operation.description,
      parameters: [...((pathItem.parameters as unknown[] | undefined) ?? []), ...(operation.parameters ?? [])],
      requestBody: operation.requestBody,
      responses: operation.responses,
    })),
);

function templateToRegex(template: string): RegExp {
  const escaped = template.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\\\{[^}]+\\\}/g, "[^/]+")}$`);
}

export function findOperation(method: string, path: string): ApiOperation | undefined {
  const normalizedMethod = method.toUpperCase();
  return operations.find(
    (operation) => operation.method === normalizedMethod && templateToRegex(operation.path).test(path),
  );
}

export function operationDetails(operation: ApiOperation): Record<string, unknown> {
  return {
    method: operation.method,
    path: operation.path,
    summary: operation.summary,
    description: operation.description,
    parameters: operation.parameters,
    requestBody: operation.requestBody,
    responses: operation.responses,
  };
}
