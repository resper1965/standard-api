import { useState, useEffect, useRef } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { signIn, signUp, useSession, authClient } from "@/lib/auth-client"
import "./LoginPage.css"

/* ─────────────────────────────────────────────
   Minimal SVG Icon Set — Inline, zero-dep
   ───────────────────────────────────────────── */
const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2.5" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
)

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2.5" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
)

const IconEye = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

/* Typographic logo — no SVG needed */

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

/* ─────────────────────────────────────────────
   Animated noise background orb
   ───────────────────────────────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number
    let t = 0

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Floating particles
    const particles = Array.from({ length: 28 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.25 + 0.05,
    }))

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.004

      // Draw particles
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(148, 163, 184, ${p.alpha})`
        ctx.fill()
      })

      animId = requestAnimationFrame(render)
    }
    render()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="lp-canvas" aria-hidden="true" />
}

/* ─────────────────────────────────────────────
   Feature badge
   ───────────────────────────────────────────── */
function FeatureBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-badge">
      <span className="lp-badge-check"><IconCheck /></span>
      <span>{children}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Stat card
   ───────────────────────────────────────────── */
function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="lp-stat">
      <span className="lp-stat-value">{value}</span>
      <span className="lp-stat-label">{label}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Input Field
   ───────────────────────────────────────────── */
interface InputFieldProps {
  id: string
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  icon: React.ReactNode
  autoComplete?: string
  required?: boolean
  minLength?: number
  suffix?: React.ReactNode
}

function InputField({
  id, label, type, value, onChange, placeholder, icon,
  autoComplete, required, minLength, suffix
}: InputFieldProps) {
  const [focused, setFocused] = useState(false)
  const filled = value.length > 0

  return (
    <div className={`lp-field${focused ? " is-focused" : ""}${filled ? " is-filled" : ""}`}>
      <label className="lp-label" htmlFor={id}>{label}</label>
      <div className="lp-input-shell">
        <span className="lp-input-prefix">{icon}</span>
        <input
          id={id}
          className="lp-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-required={required}
        />
        {suffix && <span className="lp-input-suffix">{suffix}</span>}
        <span className="lp-input-border" aria-hidden="true" />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */
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
  const [formMounted, setFormMounted] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setFormMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  if (isPending) {
    return (
      <div className="lp-root" role="main">
        <div className="lp-orb lp-orb--blue" aria-hidden="true" />
        <div className="lp-orb lp-orb--violet" aria-hidden="true" />
        <div className="lp-loader-wrap" aria-label="Carregando...">
          <div className="lp-loader" />
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
          const msg = result.error.message || "Invalid email or password"
          // Detect approval gate error from backend
          if (msg.toLowerCase().includes("pending approval") || result.error.code === "ACCOUNT_PENDING_APPROVAL") {
            setPendingApproval(true)
          } else {
            setError(msg)
          }
        } else navigate("/dashboard")
      } else {
        const result = await signUp.email({ email, password, name })
        if (result.error) setError(result.error.message || "Sign up failed")
        else {
          // Show pending approval message instead of redirecting
          setPendingApproval(true)
        }
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message :
        (err as Record<string, unknown>)?.message as string ||
        "An unexpected error occurred"
      if (msg.toLowerCase().includes("pending approval")) {
        setPendingApproval(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: "login" | "signup") => {
    setError("")
    setForgotSent(false)
    setPendingApproval(false)
    setMode(m)
    setName("")
    setEmail("")
    setPassword("")
  }

  const isLogin = mode === "login"

  return (
    <div className="lp-root" role="main">
      {/* ── Background system ── */}
      <div className="lp-orb lp-orb--blue" aria-hidden="true" />
      <div className="lp-orb lp-orb--violet" aria-hidden="true" />
      <div className="lp-orb lp-orb--cyan" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />
      <ParticleCanvas />
      <div className="lp-vignette" aria-hidden="true" />

      <div className="lp-layout">

        {/* ═══════════════════════════════════════════
            LEFT PANEL — Branding & social proof
            ═══════════════════════════════════════════ */}
        <aside className="lp-left" aria-label="Standard Platform overview">

          {/* Typographic logo */}
          <div className="lp-logo">
            <span className="lp-logo-mark">
              b<span className="lp-logo-dot">.</span>standard
            </span>
          </div>

          {/* Hero copy */}
          <div className="lp-hero">
            <p className="lp-hero-eyebrow">
              be secure<span className="lp-dot">.</span>
            </p>
            <h1 className="lp-hero-title">
              Compliance without{" "}
              <span className="lp-hero-accent">the chaos</span>{" "}
              <span className="lp-hero-accent lp-hero-accent--delay">or the spreadsheets.</span>
            </h1>
            <p className="lp-hero-desc">
              b.standard turns your security assessment lifecycle into a
              structured, traceable workflow. Every control mapped.
              Every gap scored. Every finding audit&#8209;ready — at API speed.
            </p>
          </div>

          {/* Stat grid */}
          <div className="lp-stats" role="list" aria-label="Platform capabilities">
            <StatCard value="REST" label="API" />
            <StatCard value="SDK" label="TypeScript" />
            <StatCard value="MCP" label="AI Agents" />
            <StatCard value="231+" label="Frameworks" />
          </div>

          {/* Trust badges */}
          <div className="lp-badges" role="list" aria-label="Platform certifications">
            <FeatureBadge>API-First Architecture</FeatureBadge>
            <FeatureBadge>Multi-Tenant Isolation</FeatureBadge>
            <FeatureBadge>Enterprise-Grade Security</FeatureBadge>
            <FeatureBadge>Cloudflare Edge Infrastructure</FeatureBadge>
          </div>

          {/* Bottom tagline */}
          <div className="lp-left-footer">
            <span className="lp-footer-dot" aria-hidden="true" />
            <span>bekaa — powered by cloudflare edge</span>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════
            RIGHT PANEL — Auth form
            ═══════════════════════════════════════════ */}
        <section
          className={`lp-right${formMounted ? " lp-right--in" : ""}`}
          aria-label={isLogin ? "Sign in form" : "Create account form"}
        >
          {/* Mobile-only logo */}
          <div className="lp-mobile-logo" aria-hidden="true">
            <span className="lp-logo-mark lp-logo-mark--sm">
              b<span className="lp-logo-dot">.</span>standard
            </span>
          </div>

          {/* Mode switcher */}
          <div className="lp-tabs" role="tablist" aria-label="Authentication mode">
            <button
              className={`lp-tab${isLogin ? " lp-tab--active" : ""}`}
              role="tab"
              aria-selected={isLogin}
              aria-controls="lp-form-panel"
              id="tab-login"
              onClick={() => switchMode("login")}
              type="button"
            >
              Sign In
            </button>
            <button
              className={`lp-tab${!isLogin ? " lp-tab--active" : ""}`}
              role="tab"
              aria-selected={!isLogin}
              aria-controls="lp-form-panel"
              id="tab-signup"
              onClick={() => switchMode("signup")}
              type="button"
            >
              Create Account
            </button>
          </div>

            {/* Form card */}
          <div className="lp-card" id="lp-form-panel" role="tabpanel" aria-labelledby={isLogin ? "tab-login" : "tab-signup"}>
            {pendingApproval ? (
              <div className="lp-card-header" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
                <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(167, 139, 250, 0.15))", marginBottom: 16 }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#60a5fa" }}>
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </div>
                <h2 className="lp-card-title" style={{ marginBottom: 8 }}>
                  {isLogin ? "Account Pending" : "Account Created!"}
                </h2>
                <p className="lp-card-sub" style={{ lineHeight: 1.6 }}>
                  {isLogin
                    ? "Your account is awaiting approval by a platform administrator. You will be able to access the platform once your account is approved."
                    : "Your account has been created successfully. A platform administrator will review and approve your access shortly."}
                </p>
                <button
                  type="button"
                  className="lp-submit"
                  style={{ marginTop: 24, maxWidth: 200 }}
                  onClick={() => { setPendingApproval(false); switchMode("login"); }}
                >
                  <span className="lp-submit-content">Back to Sign In</span>
                  <span className="lp-submit-shine" aria-hidden="true" />
                </button>
              </div>
            ) : (
            <>
            <div className="lp-card-header">
              <h2 className="lp-card-title">
                {isLogin ? "Welcome back" : "Get started"}
              </h2>
              <p className="lp-card-sub">
                {isLogin
                  ? "Sign in to the Platform Console"
                  : "Create your platform account"}
              </p>
            </div>

            <form className="lp-form" onSubmit={handleSubmit} noValidate>
              {!isLogin && (
                <div className="lp-field-enter">
                  <InputField
                    id="lp-name"
                    label="Full Name"
                    type="text"
                    value={name}
                    onChange={setName}
                    placeholder="Jane Doe"
                    icon={<IconUser />}
                    autoComplete="name"
                    required
                  />
                </div>
              )}

              <InputField
                id="lp-email"
                label="Work Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@company.com"
                icon={<IconMail />}
                autoComplete="email"
                required
              />

              <InputField
                id="lp-password"
                label="Password"
                type={showPw ? "text" : "password"}
                value={password}
                onChange={setPassword}
                placeholder={isLogin ? "••••••••" : "Min. 12 characters"}
                icon={<IconLock />}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 12}
                suffix={
                  <button
                    type="button"
                    className="lp-pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <IconEyeOff /> : <IconEye />}
                  </button>
                }
              />

              {/* Error feedback */}
              {error && (
                <div className="lp-error" role="alert" aria-live="assertive">
                  <span className="lp-error-icon"><IconAlert /></span>
                  <span>{error}</span>
                </div>
              )}

              {/* Forgot password — login mode only */}
              {isLogin && (
                <div className="lp-forgot-wrap">
                  {forgotSent ? (
                    <p className="lp-forgot-sent" role="status">
                      ✓ Password reset link sent! Check your email inbox.
                    </p>
                  ) : (
                    <button
                      type="button"
                      className="lp-link lp-forgot-link"
                      onClick={async () => {
                        if (!email.trim()) {
                          setError("Enter your email first, then click Forgot password.")
                          return
                        }
                        setError("")
                        setLoading(true)
                        try {
                          const res = await authClient.requestPasswordReset({
                            email,
                            redirectTo: window.location.origin + "/auth/reset-password",
                          })
                          if (res.error) {
                            setError(res.error.message || "Failed to send reset link.")
                          } else {
                            setForgotSent(true)
                          }
                        } catch (err: unknown) {
                          setError(err instanceof Error ? err.message : "An unexpected error occurred.")
                        } finally {
                          setLoading(false)
                        }
                      }}
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                id="lp-submit"
                className="lp-submit"
                type="submit"
                disabled={loading}
                aria-busy={loading}
              >
                <span className={`lp-submit-content${loading ? " lp-submit-content--hidden" : ""}`}>
                  {isLogin ? "Sign In" : "Create Account"}
                  <span className="lp-submit-arrow"><IconArrow /></span>
                </span>
                {loading && <span className="lp-spinner" aria-hidden="true" />}
                <span className="lp-submit-shine" aria-hidden="true" />
              </button>
            </form>
            </>)}
          </div>

          {/* Footer */}
          <p className="lp-form-footer">
            {isLogin ? "New to Standard?" : "Already have an account?"}{" "}
            <button
              className="lp-link"
              type="button"
              onClick={() => switchMode(isLogin ? "signup" : "login")}
            >
              {isLogin ? "Create an account" : "Sign in"}
            </button>
          </p>

          {/* Bottom brand */}
          <div className="lp-bottom-brand" aria-hidden="true">
            <span className="lp-bottom-dot" />
            b.standard — be secure. — bekaa {new Date().getFullYear()}
          </div>
        </section>
      </div>
    </div>
  )
}
