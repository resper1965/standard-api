import "./api-contracts.test";
import "./error-contracts.test";
import "./schema-contracts.test";
import "./soc-contracts.test";
import "./documents-contracts.test";
import "./scf-contracts.test";
import "./gap-poam-contracts.test";
import { runTests } from "../test-kit";

await runTests("contract");
