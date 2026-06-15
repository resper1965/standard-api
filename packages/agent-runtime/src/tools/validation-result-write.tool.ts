// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module validation-result-write
 * @description Write schema validation results for draft artifacts.
 * Records whether a draft passes validation without constituting approval.
 */

export type ValidationResult = {
  id: string;
  artifact_version_id: string;
  validation_type: string;
  is_valid: boolean;
  errors: string[];
  warnings: string[];
  validated_at: string;
};

export type ValidationResultWriteDependencies = {
  writeValidation: (input: {
    artifactVersionId: string;
    organizationId: string;
    validationType: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
    agentRunId?: string;
  }) => Promise<ValidationResult>;
};

export type ValidationResultWriteArgs = {
  organization_id: string;
  assessment_id: string;
  trace_id: string;
  artifact_version_id?: string;
  artifact_type?: string;
  query?: string;
};

export type ValidationResultWriteOutput = {
  validation: ValidationResult;
  disclaimer: string;
};

export function createValidationResultWriteTool(deps: ValidationResultWriteDependencies) {
  return {
    execute: async (args: ValidationResultWriteArgs): Promise<ValidationResultWriteOutput> => {
      const result = await deps.writeValidation({
        artifactVersionId: args.artifact_version_id ?? "",
        organizationId: args.organization_id,
        validationType: args.artifact_type ?? "schema_validation",
        isValid: false, // Agent proposes validation â€” human decides
        errors: [],
        warnings: [],
      });
      return {
        validation: result,
        disclaimer:
          "Validation recorded. Does not constitute final approval.",
      };
    },
  };
}

