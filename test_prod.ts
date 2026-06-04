import { createApp } from "./apps/api-gateway/src/http";
import { resolveTenantContext } from "./apps/api-gateway/src/adapters/tenant-mapping";
import { Hono } from "hono";

// we can't easily start the whole worker locally without wrangler, but we can write a mock test.
// Wait, I can just use curl against production!
