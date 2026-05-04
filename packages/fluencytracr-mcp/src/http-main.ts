#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { createFluencyMcpServer } from "./tools.js";

const MCP_PORT = Number(process.env.MCP_HTTP_PORT ?? "3030");
const MCP_HOST = process.env.MCP_HTTP_HOST ?? "127.0.0.1";
const bearer = process.env.MCP_HTTP_BEARER_TOKEN;

const app = createMcpExpressApp({ host: MCP_HOST });

const transports: Record<string, StreamableHTTPServerTransport> = {};

const authGate: RequestHandler = (req, res, next) => {
  if (!bearer) {
    next();
    return;
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${bearer}`) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

const mcpPostHandler: RequestHandler = async (req, res) => {
  const sessionIdHeader = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
  try {
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore,
        onsessioninitialized: (sid) => {
          transports[sid] = transport;
        }
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) {
          delete transports[sid];
        }
      };
      const server = createFluencyMcpServer();
      await server.connect(transport);
      await transport.handleRequest(req as never, res as never, req.body);
      return;
    } else {
      res.status(400).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Bad Request: No valid session ID provided" },
        id: null
      });
      return;
    }
    await transport.handleRequest(req as never, res as never, req.body);
  } catch (e) {
    console.error("[fluencytracr-mcp] MCP POST error", e);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null
      });
    }
  }
};

const mcpGetHandler: RequestHandler = async (req, res) => {
  const sessionIdHeader = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req as never, res as never);
};

const mcpDeleteHandler: RequestHandler = async (req, res) => {
  const sessionIdHeader = req.headers["mcp-session-id"];
  const sessionId = Array.isArray(sessionIdHeader) ? sessionIdHeader[0] : sessionIdHeader;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req as never, res as never);
};

app.post("/mcp", authGate, mcpPostHandler);
app.get("/mcp", authGate, mcpGetHandler);
app.delete("/mcp", authGate, mcpDeleteHandler);

app.listen(MCP_PORT, MCP_HOST, () => {
  console.error(
    `[fluencytracr-mcp] Streamable HTTP MCP on http://${MCP_HOST}:${MCP_PORT}/mcp ` +
      (bearer ? "(bearer auth on)" : "(no MCP bearer token)")
  );
});

process.on("SIGINT", async () => {
  for (const id of Object.keys(transports)) {
    try {
      await transports[id].close();
    } catch {
      /* ignore */
    }
    delete transports[id];
  }
  process.exit(0);
});
