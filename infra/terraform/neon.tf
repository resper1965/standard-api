# ==============================================================================
# NEON SERVERLESS POSTGRESQL RESOURCES
# Disaster Recovery Core
# ==============================================================================

resource "neon_project" "standard_api" {
  name       = "standard-api-${var.environment}"
  region_id  = "aws-us-east-1"
  pg_version = 16
}

resource "neon_branch" "main" {
  project_id = neon_project.standard_api.id
  name       = "main"
}

# The neon_database is usually created automatically with the branch,
# but we explicitly manage it for DR.
resource "neon_database" "standard_db" {
  project_id = neon_project.standard_api.id
  branch_id  = neon_branch.main.id
  name       = "standard_db"
  owner_name = neon_role.standard_admin.name
}

resource "neon_role" "standard_admin" {
  project_id = neon_project.standard_api.id
  branch_id  = neon_branch.main.id
  name       = "standard_admin"
}

# Outputs the Connection URI. In a fully automated setup, this output 
# could be piped directly into Cloudflare Secrets using the cloudflare_worker_secret resource.
output "db_connection_uri" {
  value       = "postgres://${neon_role.standard_admin.name}:${neon_role.standard_admin.password}@${neon_branch.main.endpoint_id}.pooler.neon.tech/${neon_database.standard_db.name}?sslmode=require"
  description = "The direct connection string for Drizzle ORM."
  sensitive   = true
}
