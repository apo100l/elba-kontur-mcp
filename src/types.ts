export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ApiOperation {
  method: HttpMethod;
  path: string;
  summary: string;
  description?: string;
  parameters: unknown[];
  requestBody?: unknown;
  responses?: unknown;
}

export interface OpenApiDocument {
  info: { title: string; version: string; description?: string };
  paths: Record<string, Record<string, any>>;
  components?: unknown;
}
