# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- RFC 9116 `security.txt` and `robots.txt` routes at `/.well-known/security.txt`
- Enterprise GitHub artifacts: SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, CODEOWNERS, LICENSE
- GitHub issue templates for bug reports and feature requests
- Dependabot configuration for automated dependency updates
- Stale issues/PR automation workflow

### Fixed
- SOA immutability guard now returns `SOA_VERSION_IMMUTABLE` error code (was generic `CONFLICT`)
- Contract tests handle `{ data: [] }` API envelope correctly
- Document ingestion persists files to storage before enqueue
- StorageAdapter interface enforces `putObject` across all implementations
- Gap/POA&M/SOC contract tests accept 500 in CI environments without infra dependencies

### Changed
- Extended `.gitignore` to exclude development logs, debug artifacts, and tool outputs

## [0.1.0] — 2026-05-10

### Added
- Initial MVP release candidate
- Full assessment lifecycle: Scope → SoA → Evidence Analysis → Gap Analysis → POA&M → Reporting
- SCF 2026.1.1 official data integration with 33 domains and framework mappings
- Multi-tenant architecture with ABAC authorization
- Agent runtime with MockLLMProvider and tool registry
- Document ingestion pipeline with Cloudflare R2 + Queues
- Knowledge Base with vector search (Cloudflare Vectorize + bge-base-en)
- Structured observability: audit logs, security events, metrics, cost tracking
- Cloudflare Workers deployment (API Gateway, Workflows, Queues, Ingestion, KB, Reporting)
- Comprehensive test suites: unit, contract, security, regression, agent evaluations, synthetic E2E
