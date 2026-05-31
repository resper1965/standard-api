import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useSession } from "@/lib/auth-client"
import { api } from "@/lib/api"
import "./LoginPage.css"

/* ── Inline SVG Icons ── */
const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IcoBuilding = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-ico">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
    <line x1="9" y1="22" x2="9" y2="16" />
    <line x1="15" y1="22" x2="15" y2="16" />
    <line x1="9" y1="16" x2="15" y2="16" />
    <path d="M9 10h.01" />
    <path d="M15 10h.01" />
    <path d="M9 14h.01" />
    <path d="M15 14h.01" />
    <path d="M9 6h.01" />
    <path d="M15 6h.01" />
  </svg>
)

const IcoLink = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-ico">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)

const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IcoAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-error-ico">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function OnboardingPage() {
  const { data: session } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [autoSlug, setAutoSlug] = useState(true)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Auto-generate slug from name if autoSlug is enabled
  useEffect(() => {
    if (autoSlug) {
      setSlug(slugify(name))
    }
  }, [name, autoSlug])

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
  }

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAutoSlug(false)
    setSlug(slugify(e.target.value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) {
      setError("Please fill in all fields")
      return
    }
    setError("")
    setLoading(true)

    try {
      // 1. Create the Better Auth organization (which JIT provisions standard tenant/org)
      const res = await api<{ organization_id: string }>("/api/v1/users/me/organizations", {
        method: "POST",
        body: JSON.stringify({ name, slug }),
      })

      const orgId = res.organization_id;

      // 2. Activate the organization session
      await api(`/api/v1/users/me/organizations/${orgId}/activate`, {
        method: "POST"
      })

      // 3. Force page reload and redirection to dashboard
      window.location.href = "/dashboard"
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create organization. Please try again."
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* ── Animated Background ── */}
      <div className="login-aurora">
        <div className="login-aurora-accent" />
      </div>
      <div className="login-grid" />

      <div className="login-container">
        {/* ── Left Panel: Branding & Context ── */}
        <div className="login-left">
          <div className="login-brand">
            <div className="login-brand-icon"><IcoShield /></div>
            <span className="login-brand-name">Standard</span>
          </div>

          <h1 className="login-hero-title">
            Set up your{" "}
            <span className="login-hero-gradient">Compliance Workspace.</span>
          </h1>

          <p className="login-hero-desc">
            To start mapping security controls and conducting assessments, you need to create your first workspace organization.
          </p>

          <div className="login-trust">
            <div className="login-trust-badge">
              <IcoCheck /> Automated JIT Tenancy
            </div>
            <div className="login-trust-badge">
              <IcoCheck /> Isolated Evidences Space
            </div>
            <div className="login-trust-badge">
              <IcoCheck /> SCF Core Pre-configured
            </div>
          </div>
        </div>

        {/* ── Right Panel: Form ── */}
        <div className="login-right">
          <div className="login-form-wrapper">
            {/* Mobile-only brand */}
            <div className="login-mobile-brand">
              <div className="login-mobile-brand-icon"><IcoShield /></div>
              <span className="login-mobile-brand-name">Standard</span>
            </div>

            <div className="login-header">
              <h2 className="login-header-title">Create organization</h2>
              <p className="login-header-sub">
                Let's launch your standard tenant workspace
              </p>
            </div>

            <div className="login-card">
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="login-field">
                  <label className="login-label" htmlFor="org-name">Organization Name</label>
                  <div className="login-input-wrap">
                    <div className="login-input-icon"><IcoBuilding /></div>
                    <input
                      id="org-name"
                      className="login-input"
                      type="text"
                      value={name}
                      onChange={handleNameChange}
                      placeholder="Acme Corporation"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="login-field">
                  <label className="login-label" htmlFor="org-slug">Slug URL / Identifier</label>
                  <div className="login-input-wrap">
                    <div className="login-input-icon"><IcoLink /></div>
                    <input
                      id="org-slug"
                      className="login-input"
                      type="text"
                      value={slug}
                      onChange={handleSlugChange}
                      placeholder="acme-corporation"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <div className="login-error" role="alert">
                    <IcoAlert />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  className="login-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="login-spinner" />
                  ) : (
                    "Launch Workspace"
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
