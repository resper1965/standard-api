// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";
import {
  WorkflowStateSchema,
  AppetiteLevelSchema,
  TreatmentOptionSchema,
  RightSchema,
  LegalBasisSchema,
  BreachRulesSchema,
  TransferRulesSchema,
  ConsentRulesSchema,
  DPIATriggerSchema,
  PenaltiesSchema,
  DataSubjectRefSchema,
  DataCategoryRefSchema,
  RetentionRuleRefSchema,
  LifeCycleStageRefSchema,
  DataOriginRefSchema,
  CollectionMethodRefSchema,
  ProcessingPurposeRefSchema,
  SecurityMeasureRefSchema,
  DisposalMethodRefSchema,
  RiskFactorRefSchema,
  VolumeScaleRefSchema,
  DepartmentRefSchema,
  BgCheckTypeRefSchema,
  ClearanceLevelRefSchema,
  MaturityLevelRefSchema,
  RegulationSchema,
  RiskMethodologySchema,
  RiskCategorySchema,
  KRISchema,
  RiskSchema,
  AssessmentTemplateSchema,
  WorkflowTemplateSchema
} from "./v2-schemas";

/**
 * V2 API Types (Regulatory Intelligence API)
 *
 * This file contains the strict TypeScript interfaces for the V2 specification.
 * It is now derived from Zod schemas for runtime validation support.
 */

// â”€â”€â”€ Shared Common Types â”€â”€â”€

export type WorkflowState = z.infer<typeof WorkflowStateSchema>;
export type AppetiteLevel = z.infer<typeof AppetiteLevelSchema>;
export type TreatmentOption = z.infer<typeof TreatmentOptionSchema>;
export type Right = z.infer<typeof RightSchema>;
export type LegalBasis = z.infer<typeof LegalBasisSchema>;
export type BreachRules = z.infer<typeof BreachRulesSchema>;
export type TransferRules = z.infer<typeof TransferRulesSchema>;
export type ConsentRules = z.infer<typeof ConsentRulesSchema>;
export type DPIATrigger = z.infer<typeof DPIATriggerSchema>;
export type Penalties = z.infer<typeof PenaltiesSchema>;

// â”€â”€â”€ Reference Data Types (CB-E & CB-F) â”€â”€â”€

export type DataSubjectRef = z.infer<typeof DataSubjectRefSchema>;
export type DataCategoryRef = z.infer<typeof DataCategoryRefSchema>;
export type RetentionRuleRef = z.infer<typeof RetentionRuleRefSchema>;
export type LifeCycleStageRef = z.infer<typeof LifeCycleStageRefSchema>;
export type DataOriginRef = z.infer<typeof DataOriginRefSchema>;
export type CollectionMethodRef = z.infer<typeof CollectionMethodRefSchema>;
export type ProcessingPurposeRef = z.infer<typeof ProcessingPurposeRefSchema>;
export type SecurityMeasureRef = z.infer<typeof SecurityMeasureRefSchema>;
export type DisposalMethodRef = z.infer<typeof DisposalMethodRefSchema>;
export type RiskFactorRef = z.infer<typeof RiskFactorRefSchema>;
export type VolumeScaleRef = z.infer<typeof VolumeScaleRefSchema>;
export type DepartmentRef = z.infer<typeof DepartmentRefSchema>;
export type BgCheckTypeRef = z.infer<typeof BgCheckTypeRefSchema>;
export type ClearanceLevelRef = z.infer<typeof ClearanceLevelRefSchema>;
export type MaturityLevelRef = z.infer<typeof MaturityLevelRefSchema>;

// â”€â”€â”€ Resource Domains Types (CB-A, CB-B, CB-C, CB-D) â”€â”€â”€

export type Regulation = z.infer<typeof RegulationSchema>;
export type RiskMethodology = z.infer<typeof RiskMethodologySchema>;
export type RiskCategory = z.infer<typeof RiskCategorySchema>;
export type KRI = z.infer<typeof KRISchema>;
export type Risk = z.infer<typeof RiskSchema>;
export type AssessmentTemplate = z.infer<typeof AssessmentTemplateSchema>;
export type WorkflowTemplate = z.infer<typeof WorkflowTemplateSchema>;

