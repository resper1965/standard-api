import { useNavigate } from "react-router-dom"
import { useSession, signOut } from "@/lib/auth-client"
import "./LoginPage.css"

/* ── Inline SVG Icons ── */
const IcoShield = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

const IcoClock = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="login-ico">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

export function OnboardingPage() {
  const { data: session } = useSession()
  const navigate = useNavigate()

  // If user already has an org (e.g. assigned by admin), skip onboarding
  // The DashboardLayout handles auto-activation.

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
            Welcome to{" "}
            <span className="login-hero-gradient">Standard.</span>
          </h1>

          <p className="login-hero-desc">
            Your account has been created successfully. A platform administrator
            will assign you to an organization so you can start working.
          </p>
        </div>

        {/* ── Right Panel: Waiting State ── */}
        <div className="login-right">
          <div className="login-form-wrapper">
            {/* Mobile-only brand */}
            <div className="login-mobile-brand">
              <div className="login-mobile-brand-icon"><IcoShield /></div>
              <span className="login-mobile-brand-name">Standard</span>
            </div>

            <div className="login-header">
              <h2 className="login-header-title">Awaiting Organization</h2>
              <p className="login-header-sub">
                Your administrator will assign you to a workspace
              </p>
            </div>

            <div className="login-card" style={{ textAlign: "center", padding: "2.5rem 2rem" }}>
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(96, 165, 250, 0.15), rgba(167, 139, 250, 0.15))",
                marginBottom: 20
              }}>
                <IcoClock />
              </div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 600, marginBottom: 8, color: "var(--text-primary, #e2e8f0)" }}>
                No Organization Assigned
              </h3>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.7, color: "var(--text-secondary, #94a3b8)", maxWidth: 360, margin: "0 auto 24px" }}>
                A platform administrator needs to approve your account and assign
                you to an organization. You'll be able to access the dashboard
                once this is complete.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  className="login-submit"
                  type="button"
                  style={{ maxWidth: 180, opacity: 0.9 }}
                  onClick={() => window.location.reload()}
                >
                  Refresh Status
                </button>
                <button
                  className="login-submit"
                  type="button"
                  style={{
                    maxWidth: 140,
                    background: "transparent",
                    border: "1px solid rgba(148, 163, 184, 0.3)",
                    color: "var(--text-secondary, #94a3b8)"
                  }}
                  onClick={async () => {
                    await signOut();
                    window.location.href = "/login";
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
