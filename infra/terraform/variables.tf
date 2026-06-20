variable "cloudflare_api_token" {
  type        = string
  description = "Cloudflare API Token with edit permissions for Workers, KV, D1, R2, Queues, Vectorize"
  sensitive   = true
}

variable "cloudflare_account_id" {
  type        = string
  description = "Cloudflare Account ID"
}

variable "neon_api_key" {
  type        = string
  description = "Neon Serverless Database API Key"
  sensitive   = true
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g., production, staging)"
  default     = "production"
}
