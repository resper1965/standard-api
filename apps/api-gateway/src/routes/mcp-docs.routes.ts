import type { RouteDefinition } from "../http";

const MCP_GUIDE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Standard GRC Â· MCP Integration Guide</title>
  <meta name="description" content="Connect AI assistants to your GRC assessments, SCF controls and compliance findings through the Model Context Protocol." />
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>ðŸ›¡ï¸</text></svg>" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d0e12;
      --bg-card:   #13151b;
      --bg-code:   #0a0c10;
      --border:    #1e2130;
      --border-hi: #2a2f45;
      --text:      #e2e4ed;
      --muted:     #6b7290;
      --accent:    #6366f1;
      --accent-lo: rgba(99,102,241,.12);
      --accent-hi: #818cf8;
      --green:     #34d399;
      --amber:     #fbbf24;
      --red:       #f87171;
      --radius:    10px;
      --font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      min-height: 100vh;
    }

    /* â”€â”€ Layout â”€â”€ */
    .page {
      display: grid;
      grid-template-columns: 240px 1fr;
      grid-template-rows: auto 1fr;
      min-height: 100vh;
    }

    /* â”€â”€ Top nav â”€â”€ */
    .topnav {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 32px;
      height: 60px;
      border-bottom: 1px solid var(--border);
      background: rgba(13,14,18,.85);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .topnav-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text);
      font-weight: 600;
      font-size: 15px;
      letter-spacing: -.2px;
    }

    .topnav-brand .shield {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, var(--accent) 0%, #8b5cf6 100%);
      border-radius: 7px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }

    .topnav-links {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .topnav-links a {
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      transition: color .15s, background .15s;
    }

    .topnav-links a:hover { color: var(--text); background: var(--border); }
    .topnav-links a.active { color: var(--accent-hi); background: var(--accent-lo); }

    .badge-mcp {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .5px;
      text-transform: uppercase;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      color: #fff;
      padding: 2px 8px;
      border-radius: 20px;
    }

    /* â”€â”€ Sidebar â”€â”€ */
    .sidebar {
      grid-row: 2;
      grid-column: 1;
      border-right: 1px solid var(--border);
      padding: 24px 0;
      position: sticky;
      top: 60px;
      height: calc(100vh - 60px);
      overflow-y: auto;
    }

    .sidebar-section {
      padding: 0 16px;
      margin-bottom: 6px;
    }

    .sidebar-heading {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--muted);
      padding: 12px 8px 6px;
    }

    .sidebar-link {
      display: block;
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
      padding: 6px 12px;
      border-radius: 6px;
      transition: color .15s, background .15s;
      margin-bottom: 1px;
    }

    .sidebar-link:hover { color: var(--text); background: var(--border); }
    .sidebar-link.active { color: var(--accent-hi); background: var(--accent-lo); }

    /* â”€â”€ Main content â”€â”€ */
    .main {
      grid-row: 2;
      grid-column: 2;
      padding: 48px 64px;
      max-width: 860px;
    }

    /* â”€â”€ Hero â”€â”€ */
    .hero {
      margin-bottom: 56px;
    }

    .hero-eyebrow {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: .5px;
      text-transform: uppercase;
      color: var(--accent-hi);
      margin-bottom: 16px;
    }

    .hero-eyebrow::before {
      content: '';
      display: inline-block;
      width: 20px;
      height: 2px;
      background: var(--accent);
      border-radius: 1px;
    }

    h1 {
      font-size: 38px;
      font-weight: 700;
      letter-spacing: -1px;
      line-height: 1.15;
      background: linear-gradient(135deg, #fff 30%, var(--accent-hi) 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 16px;
    }

    .hero-sub {
      font-size: 17px;
      color: var(--muted);
      max-width: 560px;
      line-height: 1.6;
    }

    /* â”€â”€ Endpoint pills â”€â”€ */
    .endpoint-row {
      display: flex;
      gap: 10px;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    .endpoint-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px 14px;
      font-family: var(--font-mono);
      font-size: 12.5px;
    }

    .method {
      font-weight: 700;
      font-size: 11px;
    }

    .method-post { color: #fbbf24; }
    .method-get  { color: #34d399; }

    /* â”€â”€ Sections â”€â”€ */
    .section { margin-bottom: 64px; }

    h2 {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -.4px;
      color: #fff;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 10px;
      scroll-margin-top: 80px;
    }

    h2 .section-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      background: var(--accent-lo);
      flex-shrink: 0;
    }

    h3 {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: .3px;
      text-transform: uppercase;
      color: var(--muted);
      margin: 28px 0 12px;
    }

    p { color: #b0b4c8; margin-bottom: 16px; }

    /* â”€â”€ Steps â”€â”€ */
    .step-grid {
      display: grid;
      gap: 16px;
    }

    .step-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px 24px;
      display: grid;
      grid-template-columns: 40px 1fr;
      gap: 16px;
      align-items: start;
      transition: border-color .2s;
    }

    .step-card:hover { border-color: var(--border-hi); }

    .step-num {
      width: 32px;
      height: 32px;
      background: linear-gradient(135deg, var(--accent), #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      color: #fff;
      flex-shrink: 0;
    }

    .step-title {
      font-size: 15px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 6px;
    }

    .step-body { color: #9099b5; font-size: 14px; }

    /* â”€â”€ Code blocks â”€â”€ */
    .code-block {
      background: var(--bg-code);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      margin: 16px 0;
    }

    .code-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
      background: rgba(255,255,255,.025);
    }

    .code-lang {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .5px;
      text-transform: uppercase;
      color: var(--muted);
    }

    .copy-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--muted);
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 4px 10px;
      cursor: pointer;
      transition: color .15s, background .15s, border-color .15s;
      font-family: inherit;
    }

    .copy-btn:hover { color: var(--text); background: var(--border); border-color: var(--border-hi); }
    .copy-btn.copied { color: var(--green); border-color: rgba(52,211,153,.4); }

    .code-block pre {
      padding: 20px;
      overflow-x: auto;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.6;
      color: #c9d1e0;
    }

    /* JSON syntax colouring */
    .json-key     { color: #818cf8; }
    .json-string  { color: #34d399; }
    .json-punct   { color: #6b7290; }
    .json-bracket { color: #e2e4ed; }

    /* â”€â”€ Query examples â”€â”€ */
    .query-list {
      display: grid;
      gap: 8px;
      margin: 16px 0;
    }

    .query-item {
      display: flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 11px 16px;
      font-size: 14px;
      color: #b0b4c8;
      transition: border-color .2s, background .2s;
    }

    .query-item:hover { border-color: var(--accent); background: var(--accent-lo); color: var(--text); }

    .query-item::before {
      content: 'â€º';
      font-size: 16px;
      color: var(--accent);
      font-weight: 700;
      flex-shrink: 0;
    }

    /* â”€â”€ Tool cards â”€â”€ */
    .tool-grid {
      display: grid;
      gap: 10px;
    }

    .tool-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 8px;
      align-items: center;
      transition: border-color .2s;
    }

    .tool-card:hover { border-color: var(--border-hi); }

    .tool-name {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 500;
      color: var(--accent-hi);
      margin-bottom: 3px;
    }

    .tool-desc {
      font-size: 13px;
      color: var(--muted);
    }

    .tool-args {
      font-family: var(--font-mono);
      font-size: 11px;
      color: #6b7290;
      background: var(--bg-code);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 3px 8px;
      white-space: nowrap;
    }

    /* â”€â”€ Full tools table â”€â”€ */
    .tools-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      font-size: 13px;
    }

    .tools-table thead tr {
      background: rgba(255,255,255,.035);
    }

    .tools-table th {
      text-align: left;
      padding: 12px 16px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .5px;
      text-transform: uppercase;
      color: var(--muted);
      border-bottom: 1px solid var(--border);
    }

    .tools-table td {
      padding: 11px 16px;
      border-bottom: 1px solid var(--border);
      vertical-align: middle;
    }

    .tools-table tbody tr:last-child td { border-bottom: none; }
    .tools-table tbody tr:hover td { background: rgba(255,255,255,.02); }

    .tools-table .t-name {
      font-family: var(--font-mono);
      font-size: 12.5px;
      color: var(--accent-hi);
    }

    .tools-table .t-desc { color: #9099b5; }

    .tools-table .t-args {
      font-family: var(--font-mono);
      font-size: 11.5px;
      color: var(--muted);
    }

    /* â”€â”€ Alert boxes â”€â”€ */
    .alert {
      display: flex;
      gap: 12px;
      padding: 14px 18px;
      border-radius: var(--radius);
      margin: 20px 0;
      font-size: 14px;
      border: 1px solid;
    }

    .alert-info {
      background: rgba(99,102,241,.08);
      border-color: rgba(99,102,241,.25);
      color: #a5b4fc;
    }

    .alert-warn {
      background: rgba(251,191,36,.06);
      border-color: rgba(251,191,36,.2);
      color: #fde68a;
    }

    .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }

    /* â”€â”€ Security list â”€â”€ */
    .security-list {
      list-style: none;
      display: grid;
      gap: 10px;
      margin: 16px 0;
    }

    .security-list li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14px;
      color: #9099b5;
    }

    .security-list li::before {
      content: 'âœ“';
      font-weight: 700;
      color: var(--green);
      flex-shrink: 0;
      margin-top: 2px;
    }

    /* â”€â”€ Troubleshooting â”€â”€ */
    .trouble-grid { display: grid; gap: 12px; }

    .trouble-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 16px 20px;
    }

    .trouble-code {
      font-family: var(--font-mono);
      font-size: 13px;
      font-weight: 600;
      color: var(--red);
      margin-bottom: 6px;
    }

    .trouble-title {
      font-size: 14px;
      font-weight: 600;
      color: #e2e4ed;
      margin-bottom: 6px;
    }

    .trouble-body { font-size: 13px; color: var(--muted); }

    /* â”€â”€ Footer â”€â”€ */
    .footer {
      margin-top: 80px;
      padding-top: 32px;
      border-top: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
      color: var(--muted);
      flex-wrap: wrap;
      gap: 12px;
    }

    .footer a { color: var(--accent-hi); text-decoration: none; }
    .footer a:hover { text-decoration: underline; }

    /* â”€â”€ Scrollbar â”€â”€ */
    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--border-hi); border-radius: 10px; }

    @media (max-width: 900px) {
      .page { grid-template-columns: 1fr; }
      .sidebar { display: none; }
      .main { grid-column: 1; padding: 32px 24px; }
      h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
<div class="page">

  <!-- â•â• Top nav â•â• -->
  <nav class="topnav">
    <a class="topnav-brand" href="/">
      <div class="shield">ðŸ›¡ï¸</div>
      Standard GRC
    </a>
    <div class="topnav-links">
      <a href="/docs">API Playground</a>
      <a href="/docs/mcp" class="active">MCP Guide <span class="badge-mcp">MCP</span></a>
      <a href="/llms.txt">llms.txt</a>
    </div>
  </nav>

  <!-- â•â• Sidebar â•â• -->
  <aside class="sidebar">
    <div class="sidebar-section">
      <div class="sidebar-heading">Getting Started</div>
      <a class="sidebar-link" href="#getting-started">Overview</a>
      <a class="sidebar-link" href="#step-api-key">1 Â· Generate API Key</a>
      <a class="sidebar-link" href="#step-configure">2 Â· Configure Client</a>
      <a class="sidebar-link" href="#step-test">3 Â· Test Connection</a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-heading">Tools</div>
      <a class="sidebar-link" href="#assessments">Assessment Management</a>
      <a class="sidebar-link" href="#scf">SCF Catalog</a>
      <a class="sidebar-link" href="#intelligence">Intelligence Engine</a>
      <a class="sidebar-link" href="#kb">KB & Evidence AI</a>
      <a class="sidebar-link" href="#soa">SoA Lifecycle</a>
      <a class="sidebar-link" href="#gap">Gap Analysis & Findings</a>
      <a class="sidebar-link" href="#platform">Platform Status</a>
      <a class="sidebar-link" href="#all-tools">All 33 Tools</a>
    </div>
    <div class="sidebar-section">
      <div class="sidebar-heading">Reference</div>
      <a class="sidebar-link" href="#security">Security</a>
      <a class="sidebar-link" href="#troubleshooting">Troubleshooting</a>
    </div>
  </aside>

  <!-- â•â• Main â•â• -->
  <main class="main">

    <!-- Hero -->
    <div class="hero" id="getting-started">
      <div class="hero-eyebrow">Model Context Protocol</div>
      <h1>Standard GRC<br>MCP Integration Guide</h1>
      <p class="hero-sub">
        Connect AI assistants to your GRC assessments, SCF controls and compliance findings
        through the Model Context Protocol â€” no custom code required.
      </p>
      <div class="endpoint-row">
        <div class="endpoint-pill">
          <span class="method method-post">POST</span>
          <span>/mcp</span>
        </div>
        <div class="endpoint-pill">
          <span class="method method-get">GET</span>
          <span>/mcp &nbsp;(SSE stream)</span>
        </div>
      </div>
    </div>

    <!-- â”€â”€ Getting Started â”€â”€ -->
    <section class="section">
      <h2><span class="section-icon">ðŸš€</span> Getting Started</h2>

      <div class="step-grid">

        <div class="step-card" id="step-api-key">
          <div class="step-num">1</div>
          <div>
            <div class="step-title">Generate your API Key</div>
            <div class="step-body">
              Log in to the Standard GRC dashboard. Go to
              <strong style="color:#e2e4ed">Settings â†’ API Keys</strong>, click
              <strong style="color:#e2e4ed">Create API Key</strong> and select the scopes you need
              (at minimum <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">assessments:read</code>
              and <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">scf:read</code>).
              Copy the key immediately â€” it will not be shown again.
            </div>
          </div>
        </div>

        <div class="step-card" id="step-configure">
          <div class="step-num">2</div>
          <div>
            <div class="step-title">Configure your MCP client</div>
            <div class="step-body">
              Add the block below to your client's config file
              (e.g. <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">claude_desktop_config.json</code>
              for Claude Desktop). Replace the placeholder with your actual key.
            </div>
            <div class="code-block" style="margin-top:14px">
              <div class="code-header">
                <span class="code-lang">JSON â€” MCP config</span>
                <button class="copy-btn" onclick="copyConfig(this)">
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 1.5A1.5 1.5 0 0 1 7 0h6a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 13 12h-1v1.5A1.5 1.5 0 0 1 10.5 15h-7A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 3.5 3H5V1.5zm-2 3v9h7v-1.5H7A1.5 1.5 0 0 1 5.5 11V4.5H3.5zM7 1.5V11h6V1.5H7z"/></svg>
                  Copy
                </button>
              </div>
              <pre id="mcp-config-code"><span class="json-bracket">{</span>
  <span class="json-key">"mcpServers"</span><span class="json-punct">:</span> <span class="json-bracket">{</span>
    <span class="json-key">"standard-grc"</span><span class="json-punct">:</span> <span class="json-bracket">{</span>
      <span class="json-key">"command"</span><span class="json-punct">:</span> <span class="json-string">"npx"</span><span class="json-punct">,</span>
      <span class="json-key">"args"</span><span class="json-punct">:</span> <span class="json-bracket">[</span>
        <span class="json-string">"-y"</span><span class="json-punct">,</span>
        <span class="json-string">"mcp-remote"</span><span class="json-punct">,</span>
        <span class="json-string">"https://standard-api.bekaa.eu/mcp"</span><span class="json-punct">,</span>
        <span class="json-string">"--header"</span><span class="json-punct">,</span>
        <span class="json-string">"Authorization: Bearer &lt;your-api-key&gt;"</span>
      <span class="json-bracket">]</span>
    <span class="json-bracket">}</span>
  <span class="json-bracket">}</span>
<span class="json-bracket">}</span></pre>
            </div>
            <div class="alert alert-warn">
              <span class="alert-icon">âš ï¸</span>
              <span>Never commit your API key to source control. Use your system's secret store or an environment variable.</span>
            </div>
          </div>
        </div>

        <div class="step-card" id="step-test">
          <div class="step-num">3</div>
          <div>
            <div class="step-title">Test your connection</div>
            <div class="step-body">Restart your AI client and try these natural-language queries:</div>
            <div class="query-list" style="margin-top:12px">
              <div class="query-item">"List all my active assessments"</div>
              <div class="query-item">"What SCF controls apply to ISO 27001?"</div>
              <div class="query-item">"Show me critical findings for assessment &lt;id&gt;"</div>
              <div class="query-item">"What's the platform health status?"</div>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- â”€â”€ Assessment Management â”€â”€ -->
    <section class="section" id="assessments">
      <h2><span class="section-icon">ðŸ“‹</span> Assessment Management</h2>
      <p>Interact with the full lifecycle of your GRC assessments â€” from listing active projects to inspecting uploaded evidence documents.</p>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"Show me all assessments in the gap_analysis_drafted state"</div>
        <div class="query-item">"Get the details for assessment a1b2c3d4"</div>
        <div class="query-item">"What documents have been uploaded to assessment a1b2c3d4?"</div>
        <div class="query-item">"Is the gap analysis phase complete for my current assessment?"</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">list-assessments</div>
            <div class="tool-desc">Returns all assessments for your organization, with optional filters for state and framework.</div>
          </div>
          <div class="tool-args">no required args</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-assessment</div>
            <div class="tool-desc">Full details of a single assessment: lifecycle state, framework, tenant metadata, and timestamps.</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-assessment-status</div>
            <div class="tool-desc">Returns the current lifecycle state and last-updated timestamp for a given assessment.</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-assessment-documents</div>
            <div class="tool-desc">Lists all evidence documents uploaded for a given assessment, including file names and ingestion status.</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ SCF Catalog â”€â”€ -->
    <section class="section" id="scf">
      <h2><span class="section-icon">ðŸ—‚ï¸</span> SCF Catalog</h2>
      <p>Browse and search the Secure Controls Framework catalog â€” the normative source of truth for all control mappings in Standard GRC.</p>

      <div class="alert alert-info">
        <span class="alert-icon">â„¹ï¸</span>
        <span>The SCF catalog reflects only <strong>official mappings</strong> present in the versioned SCF base. The assistant will not invent crosswalks or mappings that do not exist in the structured data.</span>
      </div>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"Find SCF controls related to access control"</div>
        <div class="query-item">"What does control IAC-01 require?"</div>
        <div class="query-item">"List all frameworks available in the SCF catalog"</div>
        <div class="query-item">"Which SCF controls map to SOC 2 CC6.1?"</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">search-scf-controls</div>
            <div class="tool-desc">Full-text and semantic search over the SCF control catalog. Accepts a query string and optional domain filter.</div>
          </div>
          <div class="tool-args">query</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-scf-control</div>
            <div class="tool-desc">Returns full details for a single SCF control: description, objectives, framework mappings, and SCF version.</div>
          </div>
          <div class="tool-args">control_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-scf-frameworks</div>
            <div class="tool-desc">Lists all compliance frameworks supported by the SCF catalog (ISO 27001, SOC 2, NIST CSF, LGPD, and more).</div>
          </div>
          <div class="tool-args">no required args</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-scf-domains</div>
            <div class="tool-desc">Lists all 33 SCF security domains (Access Control, Cryptography, Governance, etc.).</div>
          </div>
          <div class="tool-args">no required args</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-framework-requirements</div>
            <div class="tool-desc">Lists the requirements/clauses of a compliance framework.</div>
          </div>
          <div class="tool-args">framework_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-framework-coverage</div>
            <div class="tool-desc">Shows how many SCF controls a framework covers and how many requirements are mapped.</div>
          </div>
          <div class="tool-args">framework_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-control-mappings</div>
            <div class="tool-desc">Gets all framework requirements that map to a specific SCF control (crosswalk).</div>
          </div>
          <div class="tool-args">control_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">cross-framework-mapping</div>
            <div class="tool-desc">Compares two frameworks through shared SCF controls, showing overlap percentage.</div>
          </div>
          <div class="tool-args">framework_a, framework_b</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ Intelligence Engine â”€â”€ -->
    <section class="section" id="intelligence">
      <h2><span class="section-icon">âš¡</span> Intelligence Engine</h2>
      <p>Run compliance calculations, risk analysis, and decision-support queries powered by the Standard Intelligence Engine. These tools are <strong>stateless</strong> â€” they compute results from the SCF data layer.</p>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"What's the blast radius if control CRY-03 fails?"</div>
        <div class="query-item">"Top 5 controls for maximum ROI toward ISO 27001"</div>
        <div class="query-item">"What's my compliance score against LGPD?"</div>
        <div class="query-item">"Do I need a DPIA for processing health data under GDPR?"</div>
        <div class="query-item">"What's the breach notification SLA for LGPD at critical severity?"</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">calculate-blast-radius</div>
            <div class="tool-desc">Impact topology: which risks, regulations, and data retention rules are compromised if a control fails.</div>
          </div>
          <div class="tool-args">control_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">calculate-roi-path</div>
            <div class="tool-desc">Finds the top N controls that mitigate the most global risks simultaneously.</div>
          </div>
          <div class="tool-args">target_framework, scf_controls_implemented</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">calculate-compliance-score</div>
            <div class="tool-desc">Calculates compliance score against a regulation based on implemented SCF controls.</div>
          </div>
          <div class="tool-args">regulation_id, scf_controls_implemented</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">calculate-dpia-score</div>
            <div class="tool-desc">DPIA risk assessment considering data categories, volume scale, and mitigating controls.</div>
          </div>
          <div class="tool-args">regulation_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">check-breach-sla</div>
            <div class="tool-desc">Breach notification SLA: authority deadlines, notification requirements, and controls to activate.</div>
          </div>
          <div class="tool-args">regulation_id, severity</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">calculate-cross-coverage</div>
            <div class="tool-desc">Calculates how much of a target framework is covered by controls implemented for a source framework.</div>
          </div>
          <div class="tool-args">source_framework, target_framework, scf_controls_implemented</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ KB & Evidence AI â”€â”€ -->
    <section class="section" id="kb">
      <h2><span class="section-icon">ðŸ§ </span> KB &amp; Evidence AI</h2>
      <p>Search your assessment's knowledge base and use AI-assisted evaluation to assess evidence coverage against controls.</p>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"Search the KB for 'access control policy' in assessment &lt;id&gt;"</div>
        <div class="query-item">"Evaluate if my firewall docs cover the encryption requirement"</div>
        <div class="query-item">"Design a remediation plan for the missing MFA gap"</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">search-kb</div>
            <div class="tool-desc">Semantic search over the assessment's knowledge base. Finds evidence documents relevant to a query.</div>
          </div>
          <div class="tool-args">assessment_id, query</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">evaluate-evidence</div>
            <div class="tool-desc">AI-assisted evidence evaluation. Returns a structured schema for assessing control coverage.</div>
          </div>
          <div class="tool-args">control_requirement, evidence_description</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">architect-remediation</div>
            <div class="tool-desc">AI-assisted remediation planning. Returns a structured schema for designing action items.</div>
          </div>
          <div class="tool-args">evidence_context</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ SoA Lifecycle â”€â”€ -->
    <section class="section" id="soa">
      <h2><span class="section-icon">ðŸ“‹</span> SoA Lifecycle</h2>
      <p>Manage the full Statement of Applicability lifecycle: list versions, inspect items, validate readiness for review, and get summary statistics across the SoA.</p>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"List all SoA versions for assessment a1b2c3d4"</div>
        <div class="query-item">"Show me items marked as not_applicable in the latest SoA"</div>
        <div class="query-item">"How many controls are requires_validation vs applicable?"</div>
        <div class="query-item">"Is the SoA ready for review submission?"</div>
        <div class="query-item">"Give me a summary breakdown of the SoA"</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">list-soa-versions</div>
            <div class="tool-desc">Lists all SoA versions for an assessment with status, framework, approval info and version number.</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-soa-version</div>
            <div class="tool-desc">Full details for a specific SoA version: status, framework, scope, approval tracking, metadata.</div>
          </div>
          <div class="tool-args">soa_version_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-soa-items</div>
            <div class="tool-desc">Lists SoA items (control applicability decisions). Filter by applicability_status, implementation_status, or evidence_coverage.</div>
          </div>
          <div class="tool-args">soa_version_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-soa-item</div>
            <div class="tool-desc">Full details of a SoA item: applicability, implementation, evidence, mapping info, rationale, validation notes.</div>
          </div>
          <div class="tool-args">soa_item_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">validate-soa</div>
            <div class="tool-desc">Validates a SoA for review readiness: checks for to_be_defined items, missing rationales, unchecked evidence.</div>
          </div>
          <div class="tool-args">soa_version_id, assessment_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-soa-summary</div>
            <div class="tool-desc">Aggregated statistics: applicability breakdown, implementation breakdown, evidence coverage, pending validations.</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ Gap Analysis â”€â”€ -->
    <section class="section" id="gap">
      <h2><span class="section-icon">ðŸ”</span> Gap Analysis &amp; Findings</h2>
      <p>Review gap analysis results and individual findings produced during the assessment lifecycle. All output is schema-validated before persistence.</p>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"Show me the gap analysis for assessment a1b2c3d4"</div>
        <div class="query-item">"List all critical findings for my current assessment"</div>
        <div class="query-item">"Get the details for finding f9e8d7c6"</div>
        <div class="query-item">"How many findings are in open status?"</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">get-gap-analysis</div>
            <div class="tool-desc">Returns the approved gap analysis artifact for an assessment, including summary statistics and SCF version.</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-findings</div>
            <div class="tool-desc">Lists all findings for an assessment. Filterable by severity (critical / high / medium / low) and status (open / accepted / remediated).</div>
          </div>
          <div class="tool-args">assessment_id</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">get-finding</div>
            <div class="tool-desc">Full details for a single finding: SCF control reference, evidence summary, severity, and remediation notes.</div>
          </div>
          <div class="tool-args">finding_id</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ Platform Status â”€â”€ -->
    <section class="section" id="platform">
      <h2><span class="section-icon">ðŸ’š</span> Platform Status</h2>
      <p>Check real-time platform health and, for administrators, active SOC alerts.</p>

      <h3>Example queries</h3>
      <div class="query-list">
        <div class="query-item">"Is the Standard GRC API healthy?"</div>
        <div class="query-item">"Are there any active SOC alerts right now?" (admin only)</div>
      </div>

      <h3>Tools</h3>
      <div class="tool-grid">
        <div class="tool-card">
          <div>
            <div class="tool-name">get-platform-health</div>
            <div class="tool-desc">Returns the current health status of the API, database, queue, and storage subsystems.</div>
          </div>
          <div class="tool-args">no required args</div>
        </div>
        <div class="tool-card">
          <div>
            <div class="tool-name">list-soc-alerts</div>
            <div class="tool-desc"><strong style="color:#fbbf24">Admin only.</strong> Returns active SOC alerts with severity and timestamp. Requires the <code style="font-family:var(--font-mono);font-size:11px;color:#818cf8">soc:read</code> scope.</div>
          </div>
          <div class="tool-args">soc:read scope</div>
        </div>
      </div>
    </section>

    <!-- â”€â”€ All Tools â”€â”€ -->
    <section class="section" id="all-tools">
      <h2><span class="section-icon">ðŸ”§</span> All 33 Tools</h2>
      <p>Complete reference for all MCP tools exposed by the Standard GRC Platform.</p>

      <table class="tools-table">
        <thead>
          <tr>
            <th>Tool</th>
            <th>Category</th>
            <th>Required Args</th>
          </tr>
        </thead>
        <tbody>
          <tr><td class="t-name">list-assessments</td><td class="t-desc">Assessment</td><td class="t-args">â€”</td></tr>
          <tr><td class="t-name">get-assessment</td><td class="t-desc">Assessment</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">get-assessment-status</td><td class="t-desc">Assessment</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">list-assessment-documents</td><td class="t-desc">Assessment</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">search-scf-controls</td><td class="t-desc">SCF</td><td class="t-args">query</td></tr>
          <tr><td class="t-name">get-scf-control</td><td class="t-desc">SCF</td><td class="t-args">control_id</td></tr>
          <tr><td class="t-name">list-scf-frameworks</td><td class="t-desc">SCF</td><td class="t-args">â€”</td></tr>
          <tr><td class="t-name">list-scf-domains</td><td class="t-desc">SCF</td><td class="t-args">â€”</td></tr>
          <tr><td class="t-name">list-framework-requirements</td><td class="t-desc">SCF</td><td class="t-args">framework_id</td></tr>
          <tr><td class="t-name">get-framework-coverage</td><td class="t-desc">SCF</td><td class="t-args">framework_id</td></tr>
          <tr><td class="t-name">get-control-mappings</td><td class="t-desc">SCF</td><td class="t-args">control_id</td></tr>
          <tr><td class="t-name">cross-framework-mapping</td><td class="t-desc">SCF</td><td class="t-args">framework_a, framework_b</td></tr>
          <tr><td class="t-name">calculate-blast-radius</td><td class="t-desc">Intelligence</td><td class="t-args">control_id</td></tr>
          <tr><td class="t-name">calculate-roi-path</td><td class="t-desc">Intelligence</td><td class="t-args">target_framework, scf_controls_implemented</td></tr>
          <tr><td class="t-name">calculate-compliance-score</td><td class="t-desc">Intelligence</td><td class="t-args">regulation_id, scf_controls_implemented</td></tr>
          <tr><td class="t-name">calculate-dpia-score</td><td class="t-desc">Intelligence</td><td class="t-args">regulation_id</td></tr>
          <tr><td class="t-name">check-breach-sla</td><td class="t-desc">Intelligence</td><td class="t-args">regulation_id, severity</td></tr>
          <tr><td class="t-name">calculate-cross-coverage</td><td class="t-desc">Intelligence</td><td class="t-args">source_framework, target_framework, scf_controls_implemented</td></tr>
          <tr><td class="t-name">search-kb</td><td class="t-desc">KB & AI</td><td class="t-args">assessment_id, query</td></tr>
          <tr><td class="t-name">evaluate-evidence</td><td class="t-desc">KB & AI</td><td class="t-args">control_requirement, evidence_description</td></tr>
          <tr><td class="t-name">architect-remediation</td><td class="t-desc">KB & AI</td><td class="t-args">evidence_context</td></tr>
          <tr><td class="t-name">get-gap-analysis</td><td class="t-desc">Gap</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">list-findings</td><td class="t-desc">Gap</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">get-finding</td><td class="t-desc">Gap</td><td class="t-args">finding_id</td></tr>
          <tr><td class="t-name">list-soa-versions</td><td class="t-desc">SoA</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">get-soa-version</td><td class="t-desc">SoA</td><td class="t-args">soa_version_id</td></tr>
          <tr><td class="t-name">list-soa-items</td><td class="t-desc">SoA</td><td class="t-args">soa_version_id</td></tr>
          <tr><td class="t-name">get-soa-item</td><td class="t-desc">SoA</td><td class="t-args">soa_item_id</td></tr>
          <tr><td class="t-name">validate-soa</td><td class="t-desc">SoA</td><td class="t-args">soa_version_id, assessment_id</td></tr>
          <tr><td class="t-name">get-soa-summary</td><td class="t-desc">SoA</td><td class="t-args">assessment_id</td></tr>
          <tr><td class="t-name">get-platform-health</td><td class="t-desc">Platform</td><td class="t-args">â€”</td></tr>
          <tr><td class="t-name">list-soc-alerts</td><td class="t-desc">Platform</td><td class="t-args">â€”</td></tr>
        </tbody>
      </table>
    </section>

    <!-- â”€â”€ Security â”€â”€ -->
    <section class="section" id="security">
      <h2><span class="section-icon">ðŸ”’</span> Security</h2>
      <ul class="security-list">
        <li><strong style="color:#e2e4ed">Never embed API keys in source code or version control.</strong> Use environment variables or your system's secret store.</li>
        <li><strong style="color:#e2e4ed">Use the minimum required scopes.</strong> Read-only integrations only need <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">assessments:read</code> and <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">scf:read</code>.</li>
        <li><strong style="color:#e2e4ed">Each API key is tenant-scoped.</strong> There is no cross-tenant access â€” a key for Tenant A cannot read data from Tenant B.</li>
        <li><strong style="color:#e2e4ed">Rotate keys regularly</strong> and revoke any key that may have been exposed.</li>
        <li><strong style="color:#e2e4ed">Audit trail.</strong> Every MCP tool call is recorded in your tenant's audit log with timestamp, tool name, actor (key ID), and assessment context.</li>
      </ul>
    </section>

    <!-- â”€â”€ Troubleshooting â”€â”€ -->
    <section class="section" id="troubleshooting">
      <h2><span class="section-icon">ðŸ› ï¸</span> Troubleshooting</h2>

      <div class="trouble-grid">
        <div class="trouble-card">
          <div class="trouble-code">401 Unauthorized</div>
          <div class="trouble-title">API key missing, malformed, or revoked</div>
          <div class="trouble-body">Confirm the <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">Authorization: Bearer &lt;key&gt;</code> header is present and contains the full key value. Regenerate the key in Settings â†’ API Keys if needed.</div>
        </div>
        <div class="trouble-card">
          <div class="trouble-code">403 Forbidden</div>
          <div class="trouble-title">Insufficient permissions for the requested tool</div>
          <div class="trouble-body">The authenticated key does not have the required scope. Review the tool's scope requirements in the All Tools table and add the scope in Settings â†’ API Keys.</div>
        </div>
        <div class="trouble-card">
          <div class="trouble-code">tool not found</div>
          <div class="trouble-title">Incorrect tool name</div>
          <div class="trouble-body">Tool names use kebab-case: <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">list-assessments</code>, not <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">listAssessments</code>. Verify spelling against the All Tools table. Ensure your mcp-remote version is current: <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">npx -y mcp-remote@latest</code>.</div>
        </div>
        <div class="trouble-card">
          <div class="trouble-code">Connection timeout</div>
          <div class="trouble-title">MCP endpoint unreachable</div>
          <div class="trouble-body">Confirm <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">https://standard-api.bekaa.eu/mcp</code> is reachable from your network. Use <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">get-platform-health</code> for ongoing incidents. If behind a corporate proxy, configure <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">mcp-remote</code> with <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">--proxy</code>.</div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <span>Standard GRC Platform Â· MCP endpoint: <code style="font-family:var(--font-mono);font-size:12px;color:#818cf8">/mcp</code></span>
      <span>
        <a href="/docs">API Playground</a> &nbsp;Â·&nbsp;
        <a href="/llms.txt">llms.txt</a> &nbsp;Â·&nbsp;
        <a href="/llms-full.txt">llms-full.txt</a>
      </span>
    </footer>

  </main>
</div>

<script>
  // Copy MCP config (strips HTML tags for clean text)
  function copyConfig(btn) {
    const raw = \`{
  "mcpServers": {
    "standard-grc": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://standard-api.bekaa.eu/mcp",
        "--header",
        "Authorization: Bearer <your-api-key>"
      ]
    }
  }
}\`;
    navigator.clipboard.writeText(raw).then(() => {
      btn.textContent = 'âœ“ Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor"><path d="M5.5 1.5A1.5 1.5 0 0 1 7 0h6a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 13 12h-1v1.5A1.5 1.5 0 0 1 10.5 15h-7A1.5 1.5 0 0 1 2 13.5v-9A1.5 1.5 0 0 1 3.5 3H5V1.5zm-2 3v9h7v-1.5H7A1.5 1.5 0 0 1 5.5 11V4.5H3.5zM7 1.5V11h6V1.5H7z"/></svg> Copy';
        btn.classList.remove('copied');
      }, 2000);
    });
  }

  // Sidebar active link on scroll
  const sections = document.querySelectorAll('section[id], div[id]');
  const links = document.querySelectorAll('.sidebar-link');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = document.querySelector('.sidebar-link[href="#' + e.target.id + '"]');
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-60px 0px -70% 0px' });

  sections.forEach(s => obs.observe(s));
</script>
</body>
</html>`;

export const mcpDocsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/docs/mcp",
    authRequired: false,
    tenantRequired: false,
    handler: async () => {
      return new Response(MCP_GUIDE_HTML, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      });
    },
  },
];
