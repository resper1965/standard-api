import React from "react";
import { Button } from "../ui/button";

export function DeveloperDocsTab() {
  const [copied, setCopied] = React.useState(false);

  const promptText = `@system You are tasked with integrating our system with the Standard Corporate GRC Engine (API-First). 
We need to pipe raw unstructured text (like a ROPA or policy document) into their automated SCF analyzer.

### Authentication Pattern
They use pure Machine-to-Machine API Keys. You must attach this header to all outgoing requests to their API:
\`Authorization: Bearer standard_live_[YOUR_KEY_HERE]\`
DO NOT try to implement OAuth flows, it is purely Bearer API Key based.

### Target Endpoint (Fire-and-Forget Text Analysis)
URL: \`POST https://standard.bekaa.eu/api/v1/integrations/assessments/[YOUR_ASSESSMENT_ID]/analyze-text\`

Payload Schema (JSON):
\`\`\`json
{
  "raw_text": "YOUR EXTRACTED TEXT OR ROPA CONTENT",
  "mode": "consultative", // Use 'consultative' for inferences, 'strict' for pure auditing
  "context_focus": ["GDPR", "Data Privacy"]
}
\`\`\`

### Action Items for you:
1. Create a service or utility in our codebase named \`StandardIntegrationService\`.
2. Implement an async function that dispatches the \`raw_text\` to the Standard API.
3. Handle a \`202 Accepted\` response. Extract the \`job.agent_run_id\` from the response.
4. Implement a polling mechanism pointing to \`GET /api/v1/agent-runs/[agent_run_id]\` every 5 seconds until \`status\` is \`completed\`.
5. Return the resulting mapped gaps and use them to power our own UX. Maintain strict error handling for 403 Forbidden (API Key invalid).`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Developer Integration Hub</h2>
        <p className="text-muted-foreground">
          Automação e Integração B2B (Machine-to-Machine). Copie o Prompt abaixo e cole no seu Assistente de Código (Cursor, Copilot, Claude) para acelerar a integração do nosso motor ao seu software de Privacidade/GRC.
        </p>
      </div>

      <div className="rounded-md border border-[#0f5223] bg-[#051a0c] p-6 relative">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-[#22c55e]">🤖 AI Vibe-Coding Prompt (Fast-Track)</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={copyToClipboard}
            className="bg-[#051a0c] border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black transition-colors"
          >
            {copied ? "✔️ Copied!" : "📝 Copy AI Prompt"}
          </Button>
        </div>
        
        <pre className="bg-black/50 p-4 rounded text-sm text-[#e2e8f0] overflow-x-auto border border-zinc-800 font-mono whitespace-pre-wrap">
          {promptText}
        </pre>
      </div>

      <div className="p-6 rounded-md border border-zinc-800 bg-zinc-950/50">
        <h3 className="text-md font-bold text-white mb-2">Restrições M2M (Machine-to-Machine)</h3>
        <ul className="list-disc list-inside text-sm text-zinc-400 space-y-2">
          <li>As requisições autenticadas por API Key nunca podem criar novas chaves ou gerenciar organizações.</li>
          <li>Uso estrito do Header: <code className="text-yellow-400 bg-zinc-900 px-1 py-0.5 rounded">Authorization: Bearer standard_live_...</code></li>
        </ul>
      </div>
    </div>
  );
}
