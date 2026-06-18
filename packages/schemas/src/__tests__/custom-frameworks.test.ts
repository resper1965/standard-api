import { describe, it, expect, vi } from "vitest";
import { createCustomFrameworkRepository } from "../db/custom-framework.repository.js";

describe("Custom Framework Repository", () => {
  it("should create a framework repository", () => {
    const mockDb = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: "framework-123", name: "ONS" }]),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          customRequirementId: "req-1",
          customCode: "ONS-RO-1",
          scfRequirementId: "scf-req-1",
          relationshipType: "intersects"
        }
      ]),
    } as any;

    const repo = createCustomFrameworkRepository(mockDb);
    expect(repo).toBeDefined();
    expect(repo.createFramework).toBeInstanceOf(Function);
    expect(repo.addRequirements).toBeInstanceOf(Function);
    expect(repo.addStrmMappings).toBeInstanceOf(Function);
    expect(repo.getMappingsForFramework).toBeInstanceOf(Function);
  });

  it("should query mappings accurately reflecting STRM relations", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([
        {
          customRequirementId: "req-1",
          customCode: "ONS-RO-1",
          scfRequirementId: "scf-req-1",
          relationshipType: "intersects"
        }
      ]),
    } as any;

    const repo = createCustomFrameworkRepository(mockDb);
    const mappings = await repo.getMappingsForFramework("framework-123");
    
    expect(mappings).toHaveLength(1);
    expect(mappings[0]!.customCode).toBe("ONS-RO-1");
    expect(mappings[0]!.relationshipType).toBe("intersects");
  });
});
