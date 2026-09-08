import { signOut } from "@/lib/auth-client"
import "./LoginPage.css"

// The class names below are the `lp-` prefix LoginPage.css actually defines.
// This page used to write `login-*`, which matches nothing in that stylesheet,
// so it rendered as unstyled text with the inline SVGs at their intrinsic size.

const IcoClock = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

export function OnboardingPage() {
  return (
    <div className="lp-root" role="main">
      <div className="lp-orb lp-orb--a" aria-hidden="true" />
      <div className="lp-orb lp-orb--b" aria-hidden="true" />
      <div className="lp-orb lp-orb--c" aria-hidden="true" />
      <div className="lp-grid" aria-hidden="true" />
      <div className="lp-vignette" aria-hidden="true" />

      <div className="lp-layout">
        <aside className="lp-left" aria-label="b.standard Platform overview">
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

          <div className="lp-hero">
            <p className="lp-hero-eyebrow">Welcome</p>
            <h1 className="lp-hero-title">
              Your account is{" "}
              <span className="lp-hero-accent">ready.</span>
            </h1>
            <p className="lp-hero-desc">
              A platform administrator will assign you to an organization. Once
              that is done you can start running assessments.
            </p>
          </div>
        </aside>

        <section className="lp-right lp-right--in" aria-label="Account status">
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

          <div className="lp-card">
            <div className="lp-pending">
              <div className="lp-pending-icon">
                <IcoClock />
              </div>
              <h2 className="lp-card-title">No Organization Assigned</h2>
              <p className="lp-card-sub">
                A platform administrator needs to assign you to an organization.
                You will be able to access the dashboard once that is complete.
              </p>

              <button
                type="button"
                className="lp-submit"
                style={{ marginTop: "1.5rem" }}
                onClick={() => window.location.reload()}
              >
                <span className="lp-submit-content">Refresh status</span>
              </button>

              <div className="lp-form-footer">
                <button
                  type="button"
                  className="lp-link"
                  onClick={async () => {
                    await signOut()
                    window.location.href = "/login"
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
