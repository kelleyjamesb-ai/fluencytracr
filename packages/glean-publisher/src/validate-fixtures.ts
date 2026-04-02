#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildGleanDocument } from "./gleanDocument.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = join(__dirname, "../fixtures/sample-evidence-bundle.json");
const raw = JSON.parse(readFileSync(fixture, "utf8")) as unknown;
buildGleanDocument(raw);
console.error("[glean-publisher] fixture validation OK");
