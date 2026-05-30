# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| < main  | :x:                |

## Reporting a Vulnerability

**Do NOT open public issues for security vulnerabilities.**

If you discover a security vulnerability within Standard API, please report it responsibly:

1. **Email**: Send a detailed report to **security@bekaa.eu**
2. **Subject**: `[SECURITY] Standard API — <brief description>`
3. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### Response Timeline

| Action                    | SLA          |
| ------------------------- | ------------ |
| Acknowledgment            | 24 hours     |
| Initial assessment        | 72 hours     |
| Fix development           | 7–14 days    |
| Security advisory publish | After fix    |

## Security Architecture

Standard API implements defense-in-depth:

- **Data at Rest**: Neon PostgreSQL (AES-256) and Cloudflare R2 encryption
- **Authentication**: Standard Native Auth with token revocation caching on Cloudflare KV
- **Access Control**: Role-Based Access Control (RBAC) at the route and service level
- **Tenant Isolation**: All queries scoped by `tenant_id` — no cross-tenant data leakage
- **Input Validation**: Zod schema validation on all API boundaries
- **Upload Security**: Anti-malware scanning, file type validation, size limits
- **Prompt Security**: AI Gateway anti-prompt-injection for all LLM calls
- **Audit Trail**: Immutable structured audit logs with `trace_id` correlation
- **Secret Management**: No secrets in code — environment-only via Cloudflare Workers secrets
- **Error Handling**: Safe error messages — no stack traces or internal state in API responses

## Security Testing

```bash
pnpm test:security
```

Our CI pipeline runs security tests automatically on every push to `main` and on every pull request.

## Disclosure Policy

We follow [responsible disclosure](https://en.wikipedia.org/wiki/Responsible_disclosure). Security researchers who report valid vulnerabilities will be credited in our security advisories (unless anonymity is requested).
