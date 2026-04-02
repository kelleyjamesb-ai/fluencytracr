#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createFluencyMcpServer } from "./tools.js";

const server = createFluencyMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
