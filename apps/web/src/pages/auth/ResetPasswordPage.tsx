import { useState, useEffect, useRef } from "react"
import { useNavigate, useSearchParams, Link } from "react-router-dom"
import { authClient } from "@/lib/auth-client"
import "./LoginPage.css"

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2.5" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

const IconShieldFill = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.5C17.5 22.15 21 17.25 21 12V6L12 2z"
      fill="url(#shield-gradient-reset)"
    />
    <defs>
      <linearGradient id="shield-gradient-reset" x1="4" y1="2" x2="21" y2="23.5" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="100%" stopColor="#a78bfa" />
      </linearGradient>
    </defs>
  </svg>
)

const IconArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

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

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formMounted, setFormMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setFormMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  if (!token) {
    return (
      <div className="lp-root" role="main">
        <div className="lp-orb lp-orb--blue" aria-hidden="true" />
        <div className="lp-orb lp-orb--violet" aria-hidden="true" />
        <div className="lp-loader-wrap" aria-label="Error">
          <div className="lp-card" style={{ maxWidth: "420px", textAlign: "center", padding: "2rem" }}>
            <h2 className="lp-card-title" style={{ color: "#ef4444" }}>Invalid Reset Link</h2>
            <p className="lp-card-sub" style={{ marginTop: "1rem" }}>
              The password reset token is missing or invalid. Please request a new password reset link.
            </p>
            <Link to="/login" className="lp-link" style={{ display: "inline-block", marginTop: "1.5rem" }}>
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password.length < 12) {
      setError("Password must be at least 12 characters.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      })

      if (result.error) {
        setError(result.error.message || "Failed to reset password. The link may have expired.")
      } else {
        setSuccess(true)
        setTimeout(() => {
          navigate("/login")
        }, 3000)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="lp-root" role="main">
      <div className="lp-orb lp-orb--blue" aria-hidden="true" />
      <div className="lp-orb lp-orb--violet" aria-hidden="true" />
      <div className="lp-orb lp-orb--cyan" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />
      <ParticleCanvas />
      <div className="lp-vignette" aria-hidden="true" />

      <div className="lp-layout" style={{ justifyContent: "center" }}>
        <section className={`lp-right${formMounted ? " lp-right--in" : ""}`} style={{ maxWidth: "460px", width: "100%", padding: "2rem" }}>
          
          <div className="lp-mobile-logo" aria-hidden="true" style={{ marginBottom: "2rem" }}>
            <div className="lp-logo-icon lp-logo-icon--sm">
              <IconShieldFill />
            </div>
            <span className="lp-logo-name">Standard</span>
          </div>

          <div className="lp-card">
            <div className="lp-card-header">
              <h2 className="lp-card-title">Reset Password</h2>
              <p className="lp-card-sub">Choose a secure password for your account</p>
            </div>

            {success ? (
              <div style={{ textAlign: "center", padding: "1.5rem" }}>
                <p className="lp-forgot-sent" style={{ color: "#22c55e", fontSize: "1rem", fontWeight: 600 }} role="status">
                  ✓ Password reset successfully!
                </p>
                <p className="lp-card-sub" style={{ marginTop: "0.5rem" }}>
                  Redirecting you to the Sign In page...
                </p>
              </div>
            ) : (
              <form className="lp-form" onSubmit={handleSubmit} noValidate>
                <InputField
                  id="lp-password"
                  label="New Password"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="Min. 12 characters"
                  icon={<IconLock />}
                  autoComplete="new-password"
                  required
                  minLength={12}
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

                <InputField
                  id="lp-confirm-password"
                  label="Confirm Password"
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Min. 12 characters"
                  icon={<IconLock />}
                  autoComplete="new-password"
                  required
                  minLength={12}
                />

                {error && (
                  <div className="lp-error" role="alert" aria-live="assertive">
                    <span className="lp-error-icon"><IconAlert /></span>
                    <span>{error}</span>
                  </div>
                )}

                <button
                  id="lp-submit"
                  className="lp-submit"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                >
                  <span className={`lp-submit-content${loading ? " lp-submit-content--hidden" : ""}`}>
                    Reset Password
                    <span className="lp-submit-arrow"><IconArrow /></span>
                  </span>
                  {loading && <span className="lp-spinner" aria-hidden="true" />}
                  <span className="lp-submit-shine" aria-hidden="true" />
                </button>
              </form>
            )}
          </div>

          <p className="lp-form-footer">
            <Link to="/login" className="lp-link">
              Back to Sign In
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
