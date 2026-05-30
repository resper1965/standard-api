import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { signIn, signUp, useSession } from "@/lib/auth-client"
import "./LoginPage.css"

/* ── Inline SVG Icons (zero dependencies) ── */
const IcoMail = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-ico">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const IcoLock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-ico">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IcoUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-ico">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IcoEye = ({ off }: { off?: boolean }) =>
  off ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

const IcoAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-error-ico">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

/* ── Main Component ── */
export function LoginPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  if (isPending) {
    return (
      <div className="login-page">
        <div className="login-aurora"><div className="login-aurora-accent" /></div>
        <div className="login-grid" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", minHeight: "100vh" }}>
          <div className="login-spinner" />
        </div>
      </div>
    )
  }

  if (session?.user) return <Navigate to="/dashboard" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "login") {
        const result = await signIn.email({ email, password })
        if (result.error) {
          setError(result.error.message || "Invalid email or password")
        } else {
          navigate("/dashboard")
        }
      } else {
        const result = await signUp.email({ email, password, name })
        if (result.error) {
          setError(result.error.message || "Sign up failed")
        } else {
          navigate("/dashboard")
        }
      }
    } catch (err: any) {
      const msg = err?.message || err?.error?.message || err?.statusText || "An unexpected error occurred"
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: "login" | "signup") => {
    setError("")
    setMode(m)
  }

  return (
    <div className="login-page">
      {/* ── Animated Background ── */}
      <div className="login-aurora">
        <div className="login-aurora-accent" />
      </div>
      <div className="login-grid" />

      <div className="login-container">
        {/* ── Left Panel: Branding ── */}
        <div className="login-left">
          <div className="login-brand">
            <div className="login-brand-icon"><IcoShield /></div>
            <span className="login-brand-name">Standard</span>
          </div>

          <h1 className="login-hero-title">
            The SCF-Native{" "}
            <span className="login-hero-gradient">Assessment API.</span>
          </h1>

          <p className="login-hero-desc">
            Manage organizations, API keys, and integrations.
            Your gateway to the Standard Assessment Engine via REST, SDK, and MCP.
          </p>

          <div className="login-metrics">
            <div className="login-metric">
              <span className="login-metric-value">REST</span>
              <span className="login-metric-label">API</span>
            </div>
            <div className="login-metric">
              <span className="login-metric-value">SDK</span>
              <span className="login-metric-label">TypeScript</span>
            </div>
            <div className="login-metric">
              <span className="login-metric-value">MCP</span>
              <span className="login-metric-label">AI Agents</span>
            </div>
          </div>

          <div className="login-trust">
            <div className="login-trust-badge">
              <IcoCheck /> API-First
            </div>
            <div className="login-trust-badge">
              <IcoCheck /> Multi-Tenant
            </div>
            <div className="login-trust-badge">
              <IcoCheck /> Enterprise-Grade
            </div>
          </div>
        </div>

        {/* ── Right Panel: Auth Form ── */}
        <div className="login-right">
          <div className="login-form-wrapper">

            {/* Mobile-only brand */}
            <div className="login-mobile-brand">
              <div className="login-mobile-brand-icon"><IcoShield /></div>
              <span className="login-mobile-brand-name">Standard</span>
            </div>

            <div className="login-header">
              <h2 className="login-header-title">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="login-header-sub">
                {mode === "login"
                  ? "Sign in to the Platform Console"
                  : "Create your platform account"}
              </p>
            </div>

            <div className="login-card">
              <form className="login-form" onSubmit={handleSubmit}>

                {mode === "signup" && (
                  <div className="login-field">
                    <label className="login-label" htmlFor="login-name">Full Name</label>
                    <div className="login-input-wrap">
                      <div className="login-input-icon"><IcoUser /></div>
                      <input
                        id="login-name"
                        className="login-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Jane Doe"
                        required
                        autoComplete="name"
                      />
                    </div>
                  </div>
                )}

                <div className="login-field">
                  <label className="login-label" htmlFor="login-email">Email</label>
                  <div className="login-input-wrap">
                    <div className="login-input-icon"><IcoMail /></div>
                    <input
                      id="login-email"
                      className="login-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="login-field">
                  <div className="login-label-row">
                    <label className="login-label" htmlFor="login-password">Password</label>
                  </div>
                  <div className="login-input-wrap">
                    <div className="login-input-icon"><IcoLock /></div>
                    <input
                      id="login-password"
                      className="login-input"
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                    <button
                      type="button"
                      className="login-pw-toggle"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                    >
                      <IcoEye off={showPw} />
                    </button>
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
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>
            </div>

            <div className="login-footer">
              <p>
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  className="login-switch"
                  onClick={() => switchMode(mode === "login" ? "signup" : "login")}
                  type="button"
                >
                  {mode === "login" ? "Sign up" : "Sign in"}
                </button>
              </p>
            </div>

          </div>

          <div className="login-powered">
            <IcoShield /> Standard API Platform
          </div>
        </div>
      </div>
    </div>
  )
}
