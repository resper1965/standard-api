.PHONY: help setup clean-reports scan gitleaks semgrep dependency-check zap syft grype trivy checkov import

include .env
export

current_dir := $(shell pwd)

help: ## Show this help message
	@echo "DevSecOps Toolchain Command CLI"
	@echo "-----------------------------------"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Creates the required directories
	@mkdir -p ${REPORTS_DIR} ${SBOM_DIR} ${ZAP_DIR}
	@chmod +x scripts/*.sh

clean-reports: ## Cleans all generated reports
	@rm -rf ${REPORTS_DIR}/* ${SBOM_DIR}/* ${ZAP_DIR}/*
	@echo "Reports cleaned."

gitleaks: setup ## Run Gitleaks (Secrets Scanning)
	@./scripts/run-gitleaks.sh

semgrep: setup ## Run Semgrep (SAST)
	@./scripts/run-semgrep.sh

dependency-check: setup ## Run OWASP Dependency-Check (SCA)
	@./scripts/run-dependency-check.sh

zap: setup ## Run OWASP ZAP (Baseline DAST)
	@./scripts/run-zap-baseline.sh

syft: setup ## Run Syft to generate SBOM
	@./scripts/run-syft.sh

grype: setup syft ## Run Anchore Grype (Vulnerability scanning from SBOM)
	@./scripts/run-grype.sh

trivy: setup ## Run Trivy (Container & filesystem scanner)
	@./scripts/run-trivy.sh

checkov: setup ## Run Checkov (IaC vulnerability scanner)
	@./scripts/run-checkov.sh

scan: setup gitleaks semgrep dependency-check syft trivy checkov zap ## Run all security checks (Nível 3 Completo)
	@echo "All specific scans finished."

import: ## Import generated reports to the remote existing DefectDojo instance
	@./scripts/import-to-defectdojo.sh
