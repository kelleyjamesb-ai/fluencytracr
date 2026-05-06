import express from "express";
import { app as backendApp } from "./app";
import { assertJwtSecretConfigured } from "./auth_secret";

const serviceApp = express();

serviceApp.use((req, _res, next) => {
  if (req.url.startsWith("/api/__auth")) {
    req.url = req.url.replace(/^\/api\/__auth/, "/auth");
  } else if (req.url.startsWith("/__auth")) {
    req.url = req.url.replace(/^\/__auth/, "/auth");
  } else if (req.url.startsWith("/api/auth")) {
    req.url = req.url.replace(/^\/api\/auth/, "/auth");
  } else if (req.url === "/token" || req.url.startsWith("/token?")) {
    req.url = req.url.replace(/^\/token/, "/auth/token");
  } else if (req.url.startsWith("/auth/") || req.url === "/auth") {
    // Preserve already-stripped backend public paths.
  } else if (req.url.startsWith("/api/__health")) {
    req.url = req.url.replace(/^\/api\/__health/, "/health");
  } else if (req.url.startsWith("/__health")) {
    req.url = req.url.replace(/^\/__health/, "/health");
  } else if (req.url === "/api/health" || req.url.startsWith("/api/health?")) {
    req.url = req.url.replace(/^\/api\/health/, "/health");
  } else if (req.url === "/health" || req.url.startsWith("/health?")) {
    // Preserve already-stripped backend public paths.
  } else if (req.url.startsWith("/api/__orgs")) {
    req.url = req.url.replace(/^\/api\/__orgs/, "/orgs");
  } else if (req.url.startsWith("/__orgs")) {
    req.url = req.url.replace(/^\/__orgs/, "/orgs");
  } else if (req.url.startsWith("/api/orgs")) {
    req.url = req.url.replace(/^\/api\/orgs/, "/orgs");
  } else if (req.url.startsWith("/orgs/") || req.url === "/orgs") {
    // Preserve already-stripped backend public paths.
  } else if (!req.url.startsWith("/api/") && req.url !== "/api") {
    req.url = `/api${req.url.startsWith("/") ? "" : "/"}${req.url}`;
  }
  next();
});

serviceApp.use(backendApp);

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
assertJwtSecretConfigured();
serviceApp.listen(port, () => {
  console.log(`Backend Vercel service listening on ${port}`);
});
