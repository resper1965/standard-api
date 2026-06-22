import { Link } from 'react-router-dom'

export const NotFoundPage = () => (
  <div
    id="not-found-page"
    style={{
      display: 'flex',
      flexDirection: 'column',
      width: '100vw',
      height: '100vh',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg, #1a1d20)',
      gap: '1.5rem',
      fontFamily: 'var(--font, Inter, sans-serif)',
    }}
  >
    <div
      style={{
        fontSize: '5rem',
        fontWeight: 700,
        color: 'var(--sage, #a3b8ab)',
        lineHeight: 1,
        opacity: 0.3,
      }}
    >
      404
    </div>
    <h1
      style={{
        fontSize: '1.5rem',
        fontWeight: 600,
        color: 'var(--text, #e9ecef)',
        margin: 0,
      }}
    >
      Page not found
    </h1>
    <p
      style={{
        fontSize: '0.9375rem',
        color: 'var(--text-secondary, #adb5bd)',
        margin: 0,
        maxWidth: '28rem',
        textAlign: 'center',
        lineHeight: 1.6,
      }}
    >
      The page you&apos;re looking for doesn&apos;t exist or has been moved.
    </p>
    <Link
      to="/dashboard"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.625rem 1.25rem',
        borderRadius: 'var(--radius, 10px)',
        background: 'var(--sage, #a3b8ab)',
        color: 'var(--text-inverse, #1a1d20)',
        fontWeight: 500,
        fontSize: '0.875rem',
        textDecoration: 'none',
        transition: 'opacity 180ms ease',
      }}
    >
      ← Back to Dashboard
    </Link>
  </div>
)
