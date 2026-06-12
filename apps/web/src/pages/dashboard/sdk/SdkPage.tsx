import "./SdkPage.css"

export function SdkPage() {
  return (
    <div className="sdk-page">
      <div className="sdk-header">
        <h2 className="sdk-title">SDK &amp; Docs</h2>
        <p className="sdk-subtitle">
          Integrate Standard into your workflow with our official SDKs and API
          reference.
        </p>
      </div>

      <div className="sdk-grid">
        <a
          className="sdk-card"
          href="/docs"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="sdk-card-icon">📖</div>
          <h3 className="sdk-card-title">API Reference</h3>
          <p className="sdk-card-desc">
            Full OpenAPI documentation for all Standard endpoints.
          </p>
        </a>

        <a
          className="sdk-card"
          href="https://github.com/resper1965/standard-api"
          target="_blank"
          rel="noopener noreferrer"
        >
          <div className="sdk-card-icon">🛠️</div>
          <h3 className="sdk-card-title">TypeScript SDK</h3>
          <p className="sdk-card-desc">
            Type-safe client for Node.js and browser environments.
          </p>
        </a>

        <div className="sdk-card sdk-card-coming-soon">
          <div className="sdk-card-icon">🐍</div>
          <h3 className="sdk-card-title">Python SDK</h3>
          <p className="sdk-card-desc">Coming soon — async-first Python client.</p>
          <span className="sdk-badge">Coming Soon</span>
        </div>

        <div className="sdk-card sdk-card-coming-soon">
          <div className="sdk-card-icon">⚡</div>
          <h3 className="sdk-card-title">Webhooks</h3>
          <p className="sdk-card-desc">
            Real-time event streaming for assessment lifecycle events.
          </p>
          <span className="sdk-badge">Coming Soon</span>
        </div>
      </div>
    </div>
  )
}
