import "./gap-analysis.regression.test";
import "./maturity.regression.test";
import "./poam.regression.test";
import "./reporting.regression.test";
import "./soa.regression.test";
import { runTests } from "../../tests/test-kit";

await runTests("synthetic regression");
