import { IncomingMessage, ServerResponse } from "http";
import { Socket } from "net";
import type { Role } from "@learnaire/shared";

export const SCHEMA_VERSION_HEADER = "X-FluencyTracr-Schema-Version";
export const SCHEMA_VERSION = "0.1";

export const withSchemaVersion = (headers: Record<string, string> = {}) => ({
  ...headers,
  [SCHEMA_VERSION_HEADER]: SCHEMA_VERSION
});

type RequestOptions = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
};

type TestResponse = {
  status: number;
  body: unknown;
  text: string;
  headers: Record<string, string>;
};

const normalizeHeaders = (headers: Record<string, string> = {}) => {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
};

const parseBody = (text: string, contentType: string) => {
  if (!contentType.includes("application/json")) {
    return text;
  }
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const requestApp = (app: any, options: RequestOptions): Promise<TestResponse> => {
  return new Promise((resolve, reject) => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    const headers = normalizeHeaders(options.headers);
    const hasBody = options.body !== undefined;
    const rawBody = hasBody
      ? typeof options.body === "string"
        ? options.body
        : JSON.stringify(options.body)
      : "";

    req.method = options.method;
    req.url = options.path;
    req.headers = headers;

    if (hasBody) {
      if (!req.headers["content-type"]) {
        req.headers["content-type"] = "application/json";
      }
      req.headers["content-length"] = Buffer.byteLength(rawBody).toString();
    }

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = (chunk: any, encoding?: any, cb?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      return originalWrite(chunk, encoding, cb);
    };

    res.end = (chunk?: any, encoding?: any, cb?: any) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
      }
      const result = originalEnd(chunk, encoding, cb);
      const text = Buffer.concat(chunks).toString("utf8");
      const contentType = String(res.getHeader("content-type") ?? "");
      const response: TestResponse = {
        status: res.statusCode,
        body: parseBody(text, contentType),
        text,
        headers: Object.fromEntries(
          Object.entries(res.getHeaders()).map(([key, value]) => [key, String(value)])
        )
      };
      resolve(response);
      return result;
    };

    res.on("error", reject);

    (app as { handle: (req: IncomingMessage, res: ServerResponse) => void }).handle(req, res);

    process.nextTick(() => {
      if (hasBody) {
        req.push(rawBody);
      }
      req.push(null);
    });
  });
};

// Test credentials matching setup_env.ts seed users
const TEST_CREDENTIALS: Record<string, { username: string; password: string }> = {
  ADMIN: { username: "admin", password: "admin-test" },
  ENABLEMENT_LEAD: { username: "enablement", password: "enablement-test" },
  EXEC_VIEWER: { username: "viewer", password: "viewer-test" }
};

/**
 * Authenticate as a specific role and return the cookie header value.
 * Usage: const cookie = await loginAs(app, "ADMIN");
 *        requestApp(app, { ..., headers: { cookie } });
 */
export const loginAs = async (app: any, role: Role): Promise<string> => {
  const cred = TEST_CREDENTIALS[role];
  if (!cred) {
    throw new Error(`No test credentials for role: ${role}`);
  }
  const response = await requestApp(app, {
    method: "POST",
    path: "/auth/login",
    body: { username: cred.username, password: cred.password }
  });
  if (response.status !== 200) {
    throw new Error(`loginAs(${role}) failed: ${response.status} ${response.text}`);
  }
  const setCookie = response.headers["set-cookie"] ?? "";
  const match = setCookie.match(/token=([^;]+)/);
  if (!match) {
    throw new Error(`loginAs(${role}) failed: no token in set-cookie header`);
  }
  return `token=${match[1]}`;
};

/**
 * Merge auth cookie into a headers object.
 */
export const withAuth = (cookie: string, headers: Record<string, string> = {}): Record<string, string> => ({
  ...headers,
  cookie
});
