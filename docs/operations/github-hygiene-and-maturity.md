# GitHub Hygiene & Enterprise Maturity

**Date:** 2026-08-26
**Scope:** Repository governance — branches, PRs, releases, workflow permissions, supply chain
**Report (rendered):** https://claude.ai/code/artifact/f313a02a-a2d4-4070-9e9f-ec201b589b52
**Companions:** `docs/audit/2026-08-26-platform-security-audit.md`, `docs/audit/2026-08-26-ponytail-simplification.md`

## Summary

Zero open issues and a protected `main` give the impression of a tidy house.
Underneath: three workflows running with an over-scoped token, a release process
stalled for three months, and an account-takeover advisory that waited thirty
days in a queue of bot PRs.

State at survey: **9 open PRs** (8 automated), **15 branches**, **0 issues**.

---

## Fixed in PR #127 (`edf8214`)

### Least-privilege tokens

`deploy.yml`, `security-nightly.yml` and `fix-lockfile.yml` declared no
`permissions` block, so each job inherited the repository default — commonly
read/write on every scope.

```
deploy.yml            contents: read
security-nightly.yml  contents: read, security-events: write
fix-lockfile.yml      contents: write   # it does commit; declared to be reviewable
```

`security-nightly.yml` matters most: it runs `docker run returntocorp/semgrep`
over the checkout, so a compromised scanner image sat in front of an over-scoped
token.

### Run cancellation

`context-check`, `labeler`, `deploy` and `security-scan` had no `concurrency`
group, so every push to a PR left predecessors running to completion. Harmless
while public and unmetered; a bill once the repository goes private.

### Dependency PR grouping

Ungrouped action updates produced five separate PRs for one routine sweep. More
importantly, npm updates now split `applies-to: security-updates` from version
bumps — Dependabot opened #118 on 2026-07-28 carrying the `better-auth`
account-takeover patch and it went unreviewed for a month among seven other bot
PRs.

---

## Requires action in the GitHub UI

### Confirm branch protection survives the switch to private

Branch protection and rulesets require a paid plan (Team or above) on **private**
repositories. On Free, protection silently stops applying when a public
repository is made private. Check immediately after the change — a GRC platform
with an unprotected production branch is worse than the problem privacy solves.

### Release process is broken

`package.json` says `1.2.2` and releases exist through `v1.2.2` (2026-06-03).
Yet release-please PR #101, open since 2026-06-22 and marked `stale`, proposes
`chore(main): release 1.0.0` — three versions backwards.

```
Published releases   v1.0.0 · v1.1.0 · v1.2.0 · v1.2.1 · v1.2.2 (2026-06-03)
package.json         1.2.2
release-please       1.0.0        <- open since 2026-06-22, stale
```

release-please has lost track of state, typically because tags were created
outside its flow or a manifest is missing. Net effect: ~3 months of changes,
including auth fixes, with no release or changelog. For a platform selling audit
trails, untraceable versioning of the product itself is an inconsistency an
external auditor would notice.

**Fix:** move to `release-please-config.json` + `.release-please-manifest.json`
pinned to `{".": "1.2.2"}`, then close #101 as born from invalid state.

### Open PRs

| PR | Subject | Open since | Suggestion |
| --- | --- | --- | --- |
| #118 | `better-auth` 1.6.22 | 2026-07-28 | Close — #127 ships 1.6.30 |
| #101 | release 1.0.0 | 2026-06-22 | Close — invalid state |
| #120–126 | action and dep bumps | 2026-08-09/17 | Review as a batch; new grouping prevents recurrence |
| #127 | audit + fixes | 2026-08-26 | Review and merge |

Actions are SHA-pinned repo-wide — correct practice, above average. The cost is
that updates need deliberate action, which is what is happening here.

### Stale branches

```
chore/node24-workflow-sha-bump
claude/app-deep-analysis-kqvsmp
feature/threat-analysis
feature/threat-analysis-clean      # duplicate of the above
release-please--branches--main--…  # dies with #101
```

Enable *Automatically delete head branches* in Settings → General. Feature
branches need a decision: check `feature/threat-analysis` for unmerged work first.

---

## Enterprise maturity gaps

The repository already gets the hard parts right — SHA-pinned actions, blocking
gitleaks, CodeQL, nightly Semgrep with DefectDojo upload, complete CODEOWNERS, a
separate production environment. What is missing is mostly the part that *proves*
the controls ran.

| Control | Today | Target |
| --- | --- | --- |
| Required status checks | Protection exists, but required checks did not stop three broken workflows going unnoticed for months | Require `Lint & Typecheck`, `Unit & Contract Tests`, `Regression, Ev & E2E`. A check failing 100% of PRs and blocking nothing is not a control. |
| Deploy credentials | Long-lived tokens in secrets: Cloudflare, Neon, DefectDojo | OIDC with ephemeral credentials where supported. Removes the whole "leaked secret stays valid" class. |
| Build provenance | None | `actions/attest-build-provenance` on artifacts, CycloneDX SBOM attached to releases. |
| Measurable posture | No aggregate metric | Weekly OpenSSF Scorecard — a numeric baseline that catches config regressions, exactly the category of this audit's three bugs. |
| Vulnerability disclosure | `SECURITY.md` points at email and advisories | Enable Private Vulnerability Reporting so the channel exists in the UI, not only in the document. |
| Commit integrity | No signing requirement | Require signed commits and linear history on `main`. Consistent with the ADR-002 forensic-immutability claim. |
| Production approval | `environment: production` already used | Add required reviewers and a wait timer. Half the control is in place; the human gate is missing. |
| Recovery endpoints | `admin-recovery-reset-password.yml` via `workflow_dispatch` | Bind to an environment with approval. It resets any user's password; today push access is enough to fire it. |

**The thread running through all of it.** This session found three workflows
broken for months — `Context Check` never verified anything, `PR Labeler` never
labelled, and seven `@standard/schemas` scripts aborted before running. None of
them blocked a merge, so nobody had to look.

Enterprise maturity is not more controls. It is that the existing ones are
mandatory enough that a break shows up the same day.

---

## Suggested order

| When | Action | Effort |
| --- | --- | --- |
| On going private | Confirm `main` protection survived | 1 min |
| Today | Merge #127; close #118 and #101 | — |
| Today | Make the three CI jobs required checks | 5 min |
| This week | Anchor release-please with a manifest; resume releases | 30 min |
| This week | Required reviewers on `production` and recovery environments | 10 min |
| This week | Auto-delete branches; clear the five stale ones | 10 min |
| This month | Private Vulnerability Reporting; OpenSSF Scorecard | 1 h |
| This month | SBOM and attestation on releases | half a day |
| Next quarter | OIDC for Cloudflare and Neon; signed commits | 1–2 days |

---

## Method

Surveyed via the GitHub API on 2026-08-26: branches, PRs, issues, releases,
workflow runs and jobs, plus reading the configuration files under `.github/`.
Items marked fixed are in PR #127 and were validated with `pnpm lint`,
`check:migrations` and YAML parsing. Repository settings — protections,
environments, plan tier — are not readable through the API available in this
session and were inferred from observed behaviour; confirm in the UI before acting.
