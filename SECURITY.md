# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | ✅ Active support  |
| < 1.0   | ❌ End of life     |

## Reporting a Vulnerability

We take security seriously at Standard. If you discover a security vulnerability, please report it responsibly.

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

1. **Email**: Send details to **security@standard-grc.com**
2. **GitHub**: Use [GitHub Security Advisories](https://github.com/resper1965/standard-api/security/advisories/new) for private disclosure

### What to Include

- Description of the vulnerability
- Steps to reproduce
- Affected endpoints/components
- Potential impact assessment
- Suggested fix (if any)

### Response Timeline

| Stage | SLA |
|-------|-----|
| Acknowledgment | **24 hours** |
| Triage & severity assessment | **72 hours** |
| Fix for critical/high | **7 days** |
| Fix for medium/low | **30 days** |
| Public disclosure | After fix is deployed |

### Scope

**In scope:**
- API Gateway (`standard-api.bekaa.eu`)
- Authentication and authorization (API keys, RBAC, M2M)
- Data isolation (multi-tenancy breaches)
- SCF data integrity
- Assessment lifecycle approval bypasses
- Agent runtime prompt injection
- Infrastructure (Cloudflare Workers, R2, Vectorize)

**Out of scope:**
- Social engineering attacks
- Denial of service (volumetric)
- Issues in third-party dependencies (report upstream)
- Issues requiring physical access

### Safe Harbor

We support responsible disclosure. If you follow this policy:

- We will not pursue legal action against you
- We will work with you to understand and resolve the issue
- We will credit you in the advisory (if desired)
- We will not disclose your identity without permission

### Recognition

We maintain a [Security Hall of Fame](https://github.com/resper1965/standard-api/blob/main/docs/security/hall-of-fame.md) for researchers who help us improve our security posture.
