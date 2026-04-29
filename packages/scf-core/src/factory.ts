import { createSyntheticScfFixture } from "./fixtures/synthetic-scf.fixture";
import { createCsvScfImporter } from "./importers/csv-importer";
import { createOscalScfImporter } from "./importers/oscal-importer.placeholder";
import { createXlsxScfImporter } from "./importers/xlsx-importer";
import { createInMemoryScfRepository } from "./repositories/scf.repository";
import { ScfControlService } from "./services/scf-control.service";
import { ScfDomainService } from "./services/scf-domain.service";
import { ScfFrameworkService } from "./services/scf-framework.service";
import { ScfImportService } from "./services/scf-import.service";
import { ScfMappingService } from "./services/scf-mapping.service";
import { ScfVersionService } from "./services/scf-version.service";

export const createInMemoryScfCore = () => {
  const repository = createInMemoryScfRepository(createSyntheticScfFixture());
  return {
    repository,
    versions: new ScfVersionService(repository),
    domains: new ScfDomainService(repository),
    controls: new ScfControlService(repository),
    frameworks: new ScfFrameworkService(repository),
    mappings: new ScfMappingService(repository),
    imports: new ScfImportService(repository, [createCsvScfImporter(), createXlsxScfImporter(), createOscalScfImporter()])
  };
};

export type ScfCoreServices = ReturnType<typeof createInMemoryScfCore>;
