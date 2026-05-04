import { getFluencyBaseUrl, getSchemaVersionHeader, fluencyAuthHeaders } from "./config.js";

export type FetchFn = typeof fetch;

export class FluencyTracrHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown
  ) {
    super(message);
    this.name = "FluencyTracrHttpError";
  }
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function postIngest(
  orgId: string,
  params: { events: unknown[]; idempotencyKey: string; schemaVersion: string },
  fetchImpl: FetchFn = fetch
): Promise<unknown> {
  const base = getFluencyBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-FluencyTracr-Schema-Version": params.schemaVersion,
    "Idempotency-Key": params.idempotencyKey,
    ...fluencyAuthHeaders(orgId)
  };
  const res = await fetchImpl(`${base}/api/ingest`, {
    method: "POST",
    headers,
    body: JSON.stringify({ events: params.events })
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new FluencyTracrHttpError(`ingest failed: ${res.status}`, res.status, body);
  }
  return body;
}

export async function getEvidenceJson(
  orgId: string,
  path: "bundles" | "coverage" | "controls",
  window: string,
  fetchImpl: FetchFn = fetch
): Promise<unknown> {
  const base = getFluencyBaseUrl();
  const url = new URL(`${base}/api/evidence/${path}/${encodeURIComponent(orgId)}`);
  url.searchParams.set("window", window);
  const res = await fetchImpl(url.toString(), {
    method: "GET",
    headers: {
      ...fluencyAuthHeaders(orgId)
    }
  });
  const body = await readJson(res);
  if (!res.ok) {
    throw new FluencyTracrHttpError(`evidence ${path} failed: ${res.status}`, res.status, body);
  }
  return body;
}

export { getSchemaVersionHeader };
