// Entry do Worker (main em wrangler.toml). O workerd exige que TODO export
// nomeado aqui seja classe ou ExportedHandler: um `export *` de constants/errors/
// repositories/schemas/types traz valores planos (ex.: SYSTEM_ACTOR, uma string)
// e o runtime aborta com "not of type 'function or ExportedHandler'".
//
// Consumidores da biblioteca nao usam este arquivo: @standard/workflows aponta
// para orchestrator-entry.ts (ver tsconfig.base.json).
export { default, AssessmentLifecycleWorkflow } from "./assessment-lifecycle";
export { CouncilOrchestrationWorkflow } from "./council.workflow";
export { TpraApprovalWorkflow } from "./tpra-approval.workflow";
