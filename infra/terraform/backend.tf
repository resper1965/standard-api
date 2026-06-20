terraform {
  backend "s3" {
    # Bucket name on Cloudflare R2
    bucket = "terraform-states-standard-api"
    key    = "production/terraform.tfstate"
    region = "auto"
    
    # Must be supplied via environment variables or CLI arguments
    # access_key = "..."
    # secret_key = "..."
    # endpoint   = "https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
    
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_s3_checksum            = true
  }
}
