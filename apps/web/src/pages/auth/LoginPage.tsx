/**
 * LoginPage — b.standard Authentication & Landing
 * Nordic Tech Design System — Enterprise Grade
 * Be Secure · bekaa
 */
import { useState, useEffect, useRef } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { signIn, useSession, authClient } from "@/lib/auth-client"
import "./LoginPage.css"

/* ─── Icon Set — Inline SVG, zero-dep ─────────────────────── */
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

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconArrow = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const IconClock = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const IconShield = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IconLayers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
)

const IconCpu = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="14" x2="23" y2="14" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="14" x2="4" y2="14" />
  </svg>
)

const IconGlobe = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

/* ─── Floating particles (low-opacity dots) ────────────────── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let animId: number

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    const particles = Array.from({ length: 24 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      alpha: Math.random() * 0.18 + 0.04,
    }))

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(143, 168, 155, ${p.alpha})`
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

/* ─── Trust badge ──────────────────────────────────────────── */
function TrustBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp-badge">
      <span className="lp-badge-check"><IconCheck /></span>
      <span>{children}</span>
    </div>
  )
}

/* ─── Capability card ──────────────────────────────────────── */
function CapabilityCard({
  icon, label, value, desc
}: { icon: React.ReactNode; label: string; value: string; desc: string }) {
  return (
    <div className="lp-cap-card">
      <div className="lp-cap-icon">{icon}</div>
      <div className="lp-cap-body">
        <span className="lp-cap-value">{value}</span>
        <span className="lp-cap-label">{label}</span>
        <span className="lp-cap-desc">{desc}</span>
      </div>
    </div>
  )
}

/* ─── Input Field ──────────────────────────────────────────── */
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

/* ─── Main Page ────────────────────────────────────────────── */
export function LoginPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
        <div className="lp-orb lp-orb--a" aria-hidden="true" />
        <div className="lp-orb lp-orb--b" aria-hidden="true" />
        <div className="lp-loader-wrap" aria-label="Loading…">
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
      const result = await signIn.email({ email, password })
      if (result.error) {
        const msg = result.error.message || "Invalid email or password"
        if (msg.toLowerCase().includes("pending approval") || result.error.code === "ACCOUNT_PENDING_APPROVAL") {
          setPendingApproval(true)
        } else {
          setError(msg)
        }
      } else navigate("/dashboard")
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



  return (
    <div className="lp-root" role="main">

      {/* ── Ambient background system ── */}
      <div className="lp-orb lp-orb--a" aria-hidden="true" />
      <div className="lp-orb lp-orb--b" aria-hidden="true" />
      <div className="lp-orb lp-orb--c" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />
      <ParticleCanvas />
      <div className="lp-vignette" aria-hidden="true" />

      <div className="lp-layout">

        {/* ══ LEFT — Branding & value proposition ══ */}
        <aside className="lp-left" aria-label="b.standard Platform overview">

          {/* Logo + Slogan */}
          <div className="lp-logo">
            <div className="lp-logo-stack">
              <span className="lp-logo-mark">
                b<span className="lp-logo-dot">.</span>standard
              </span>
              <span className="lp-logo-slogan">
                be secure<span className="lp-logo-dot">.</span>
              </span>
            </div>
          </div>

          {/* Hero copy */}
          <div className="lp-hero">
            <p className="lp-hero-eyebrow">
              API · MCP · SDK
            </p>
            <h1 className="lp-hero-title">
              Security assessments{" "}
              <span className="lp-hero-accent">as infrastructure.</span>
            </h1>
            <p className="lp-hero-desc">
              b.standard is a headless assessment engine — REST API, MCP server
              and TypeScript SDK. Build your own compliance workflows, integrate
              with any tool, run assessments programmatically.
            </p>
          </div>

          {/* Divider */}
          <div className="lp-divider" aria-hidden="true" />

          {/* Capability cards */}
          <div className="lp-caps" role="list" aria-label="Platform capabilities">
            <CapabilityCard
              icon={<IconShield />}
              value="231+"
              label="Frameworks"
              desc="NIST, ISO 27001, SOC 2, PCI DSS and more"
            />
            <CapabilityCard
              icon={<IconLayers />}
              value="REST API"
              label="API-First"
              desc="Full lifecycle via versioned REST endpoints"
            />
            <CapabilityCard
              icon={<IconCpu />}
              value="MCP"
              label="AI Agents"
              desc="Agentic assessments with Model Context Protocol"
            />
            <CapabilityCard
              icon={<IconGlobe />}
              value="Edge"
              label="Infrastructure"
              desc="Cloudflare Workers — global, zero cold starts"
            />
          </div>

          {/* Footer */}
          <div className="lp-left-footer">
            <span className="lp-footer-dot" aria-hidden="true" />
            <span>bekaa — cloudflare edge infrastructure</span>
          </div>
        </aside>

        {/* ══ RIGHT — Auth form ══ */}
        <section
          className={`lp-right${formMounted ? " lp-right--in" : ""}`}
        >
          {/* Mobile logo */}
          <div className="lp-mobile-logo" aria-hidden="true">
            <div className="lp-mobile-logo-stack">
              <span className="lp-logo-mark lp-logo-mark--sm">
                b<span className="lp-logo-dot">.</span>standard
              </span>
              <span className="lp-logo-slogan lp-logo-slogan--sm">
                be secure<span className="lp-logo-dot">.</span>
              </span>
            </div>
          </div>

          {/* Form card */}
          <div className="lp-card" id="lp-form-panel" role="tabpanel" aria-labelledby="tab-login">
            {pendingApproval ? (
              <div className="lp-pending">
                <div className="lp-pending-icon">
                  <IconClock />
                </div>
                <h2 className="lp-card-title">
                  Account Pending Review
                </h2>
                <p className="lp-card-sub">
                  Your account is awaiting approval by a platform administrator. You will receive access once approved.
                </p>
                <button
                  type="button"
                  className="lp-submit"
                  style={{ marginTop: "1.5rem" }}
                  onClick={() => { setPendingApproval(false) }}
                >
                  <span className="lp-submit-content">
                    Back to Sign In
                    <span className="lp-submit-arrow"><IconArrow /></span>
                  </span>
                  <span className="lp-submit-shine" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <>
                <div className="lp-card-header">
                  <h2 className="lp-card-title">
                    Welcome back
                  </h2>
                  <p className="lp-card-sub">
                    Sign in to the Platform Console
                  </p>
                </div>

                <form className="lp-form" onSubmit={handleSubmit} noValidate>


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
                    placeholder="••••••••"
                    icon={<IconLock />}
                    autoComplete="current-password"
                    required
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

                  {error && (
                    <div className="lp-error" role="alert" aria-live="assertive">
                      <span className="lp-error-icon"><IconAlert /></span>
                      <span>{error}</span>
                    </div>
                  )}

                    <div className="lp-forgot-wrap">
                      {forgotSent ? (
                        <p className="lp-forgot-sent" role="status">
                          ✓ Password reset link sent. Check your inbox.
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

                  <button
                    id="lp-submit"
                    className="lp-submit"
                    type="submit"
                    disabled={loading}
                    aria-busy={loading}
                  >
                    <span className={`lp-submit-content${loading ? " lp-submit-content--hidden" : ""}`}>
                      Sign In
                      <span className="lp-submit-arrow"><IconArrow /></span>
                    </span>
                    {loading && <span className="lp-spinner" aria-hidden="true" />}
                    <span className="lp-submit-shine" aria-hidden="true" />
                  </button>
                </form>
              </>
            )}
          </div>



          <div className="lp-bottom-brand" aria-hidden="true">
            <span className="lp-bottom-dot" />
            b.standard — be secure. — bekaa {new Date().getFullYear()}
          </div>
        </section>
      </div>
    </div>
  )
}
