import { Hono } from "hono";
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import type { RequestContext } from "../http";
import type { RouteDefinition } from "../http";

extendZodWithOpenApi(z);

const CreateVersionSchema = z.object({
  versionString: z.string().min(1),
  releaseDate: z.string().min(1),
  status: z.enum(["Draft", "Published", "Archived"])
}).openapi("CreateVersionRequest");

const ThreatFmeaSchema = z.object({
  severity: z.number().min(1).max(10),
  occurrence: z.number().min(1).max(10),
  detection: z.number().min(1).max(10)
});

const CreateThreatSchema = z.object({
  versionId: z.string().min(1),
  element: z.enum(["Actor", "Process", "Data Store", "Data Flow"]),
  componentName: z.string().min(1),
  strideCategory: z.enum(["S", "T", "R", "I", "D", "E"]),
  description: z.string().min(1),
  fmea: ThreatFmeaSchema,
  mitigation: z.string(),
  status: z.enum(["Open", "Mitigated", "Accepted"])
}).openapi("CreateThreatRequest");

const UpdateThreatSchema = CreateThreatSchema.partial().omit({ versionId: true }).openapi("UpdateThreatRequest");

export const threatAnalysisRoutes: RouteDefinition[] = [
  // List all versions
  {
    method: "get",
    path: "/threat-analysis/versions",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const versions = await deps.threatAnalysis.getVersions();
      return c.json(versions);
    }
  },
  // Get a specific version
  {
    method: "get",
    path: "/threat-analysis/versions/:id",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const id = c.req.param("id");
      const version = await deps.threatAnalysis.getVersion(id);
      if (!version) return c.json({ error: "Version not found" }, 404);
      return c.json(version);
    }
  },
  // Create a new version
  {
    method: "post",
    path: "/threat-analysis/versions",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const body = await c.req.json();
      const parsed = CreateVersionSchema.parse(body);
      const created = await deps.threatAnalysis.createVersion(parsed);
      return c.json(created, 201);
    }
  },
  // List threats for a version
  {
    method: "get",
    path: "/threat-analysis/versions/:id/threats",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const id = c.req.param("id");
      const threats = await deps.threatAnalysis.getThreats(id);
      return c.json(threats);
    }
  },
  // Add a threat to a version
  {
    method: "post",
    path: "/threat-analysis/versions/:id/threats",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const id = c.req.param("id");
      const body = await c.req.json();
      const parsed = CreateThreatSchema.parse({ ...body, versionId: id });
      const created = await deps.threatAnalysis.addThreat(parsed);
      return c.json(created, 201);
    }
  },
  // Update a threat
  {
    method: "patch",
    path: "/threat-analysis/threats/:threatId",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const threatId = c.req.param("threatId");
      const body = await c.req.json();
      const parsed = UpdateThreatSchema.parse(body);
      const updated = await deps.threatAnalysis.updateThreat(threatId, parsed);
      if (!updated) return c.json({ error: "Threat not found" }, 404);
      return c.json(updated);
    }
  },
  // Delete a threat
  {
    method: "delete",
    path: "/threat-analysis/threats/:threatId",
    handler: async (c) => {
      const deps = c.get("deps") as RequestContext["Variables"]["deps"];
      const threatId = c.req.param("threatId");
      await deps.threatAnalysis.deleteThreat(threatId);
      return c.json({ success: true });
    }
  }
];
