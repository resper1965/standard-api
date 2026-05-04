import { createSyntheticScfFixture } from "./fixtures/synthetic-scf.fixture";
import { createCsvScfImporter } from "./importers/csv-importer";
import { createOscalScfImporter } from "./importers/oscal-importer.placeholder";
import { createXlsxScfImporter } from "./importers/xlsx-importer";
import { createInMemoryScfRepository } from "./repositories/scf.repository";
import type { ScfRepository } from "./repositories/scf.repository";
import { ScfControlService } from "./services/scf-control.service";
import { ScfDomainService } from "./services/scf-domain.service";
import { ScfFrameworkService } from "./services/scf-framework.service";
import { ScfImportService } from "./services/scf-import.service";
import { ScfMappingService } from "./services/scf-mapping.service";
import { ScfVersionService } from "./services/scf-version.service";

const buildServices = (repository: ScfRepository) => ({
  repository,
  versions: new ScfVersionService(repository),
  domains: new ScfDomainService(repository),
  controls: new ScfControlService(repository),
  frameworks: new ScfFrameworkService(repository),
  mappings: new ScfMappingService(repository),
  imports: new ScfImportService(repository, [createCsvScfImporter(), createXlsxScfImporter(), createOscalScfImporter()])
});

/** In-memory mode: synthetic fixture, no DB required (dev/tests) */
export const createInMemoryScfCore = () => {
  const repository = createInMemoryScfRepository(createSyntheticScfFixture());
  return buildServices(repository);
};

/** Build SCF Core from an injected repository (Drizzle, custom, etc.) */
export const createScfCoreFromRepository = (repository: ScfRepository) => buildServices(repository);

export type ScfCoreServices = ReturnType<typeof createInMemoryScfCore>;
