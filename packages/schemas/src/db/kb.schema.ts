import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { auditMetadata, timestamps } from "./_helpers";
import { organizations } from "./core.schema";
import { assessments } from "./assessment.schema";
import { documents, documentChunks } from "./document.schema";

export const kbEntries = pgTable(
  "kb_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    documentChunkId: uuid("document_chunk_id").references(
      () => documentChunks.id,
    ),
    entryType: text("entry_type").notNull(),
    contentHash: text("content_hash").notNull(),
    sourceSummary: text("source_summary"),
    ...timestamps(),
  },
  (table) => [
    index("kb_entries_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("kb_entries_chunk_idx").on(table.documentChunkId),
  ],
);

export const vectorReferences = pgTable(
  "vector_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    kbEntryId: uuid("kb_entry_id")
      .notNull()
      .references(() => kbEntries.id),
    vectorProvider: text("vector_provider")
      .default("cloudflare_vectorize")
      .notNull(),
    vectorIndexName: text("vector_index_name").notNull(),
    vectorId: text("vector_id").notNull(),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("vector_refs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    uniqueIndex("vector_refs_index_vector_uidx").on(
      table.vectorIndexName,
      table.vectorId,
    ),
  ],
);

export const kbEmbeddingJobs = pgTable(
  "kb_embedding_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    chunkId: uuid("chunk_id").references(() => documentChunks.id),
    jobType: text("job_type").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    queuedAt: timestamp("queued_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    errorCode: text("error_code"),
    errorMessageSafe: text("error_message_safe"),
    traceId: text("trace_id").notNull(),
    metadata: auditMetadata(),
    ...timestamps(),
  },
  (table) => [
    index("kb_embedding_jobs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("kb_embedding_jobs_document_idx").on(table.documentId),
    index("kb_embedding_jobs_status_idx").on(table.status),
    index("kb_embedding_jobs_trace_idx").on(table.traceId),
  ],
);

export const kbSearchLogs = pgTable(
  "kb_search_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    assessmentId: uuid("assessment_id")
      .notNull()
      .references(() => assessments.id),
    actorId: uuid("actor_id"),
    queryHash: text("query_hash").notNull(),
    searchType: text("search_type").notNull(),
    filters: jsonb("filters")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    resultCount: integer("result_count").default(0).notNull(),
    traceId: text("trace_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("kb_search_logs_assessment_idx").on(
      table.organizationId,
      table.assessmentId,
    ),
    index("kb_search_logs_trace_idx").on(table.traceId),
    index("kb_search_logs_query_hash_idx").on(table.queryHash),
  ],
);
