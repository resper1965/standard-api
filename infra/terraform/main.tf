# ==============================================================================
# CLOUDFLARE RESOURCES
# Disaster Recovery Core
# ==============================================================================

# 1. R2 BUCKETS
# ------------------------------------------------------------------------------
resource "cloudflare_r2_bucket" "documents" {
  account_id = var.cloudflare_account_id
  name       = "standard-api-documents-${var.environment}"
  location   = "WNAM" # Standardize location for B2B compliance
}

resource "cloudflare_r2_bucket" "reports" {
  account_id = var.cloudflare_account_id
  name       = "standard-api-reports-${var.environment}"
  location   = "WNAM"
}

# 2. KV NAMESPACES
# ------------------------------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "cache" {
  account_id = var.cloudflare_account_id
  title      = "standard-cache-${var.environment}"
}

# 3. QUEUES
# ------------------------------------------------------------------------------
resource "cloudflare_queue" "ingestion" {
  account_id = var.cloudflare_account_id
  name       = "document-ingestion-queue-${var.environment}"
}

resource "cloudflare_queue" "agent_run" {
  account_id = var.cloudflare_account_id
  name       = "agent-run-queue-${var.environment}"
}

# 4. VECTORIZE INDEXES (RAG)
# ------------------------------------------------------------------------------
# The vector index requires specific dimension sizes depending on the embeddings model
resource "cloudflare_vectorize_index" "rag_index" {
  account_id = var.cloudflare_account_id
  name       = "standard-rag-index-${var.environment}"
  # Using OpenAI text-embedding-3-small dimensions as standard
  dimensions = 1536 
  metric     = "cosine"
}

# ==============================================================================
# NOTE: Worker bindings to these resources are managed in the wrangler.toml files 
# during CI/CD to prevent state drift between application code and terraform.
# Terraform acts as the infrastructure scaffold for DR.
# ==============================================================================
