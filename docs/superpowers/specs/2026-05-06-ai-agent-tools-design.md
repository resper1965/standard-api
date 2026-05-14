# Design: Standard SCF Agentic Assessment - Auto-Discovery Tools Integration

## 1. Goal

Create a seamless and automated integration between the Standard Backend API and an external multi-agent framework built for Privacy processes (ROPA) analysis. 
The external team relies on giving their Agents "Tools" so the LLM is aware of the Standard Controls database.

## 2. Our Side (Standard Backend Development Tasks)

We need to implement the following on our platform to support the use case:

1. **Update Controls Repository (searchControls)**
   - Update packages/scf-core/.../controls.repository.ts to support querying by the 	hreatTags metadata.
   - Use the Drizzle PostgreSQL \@>\ (arrayContains) operator on scf_control_metadata.threat_tags.

2. **Update the Gateway Search Controller**
   - In pps/api-gateway/src/routes/scf.routes.ts, accept an optional ?tags=DPI-Needed query schema and pass it down to the service.

3. **Develop Auto-Discovery Endpoint (/agent-tools)**
   - Create a new M2M-protected controller: GET /api/v1/agent-tools/scf-controls.
   - The route must return an exact literal string representation of an OpenAI Tool execution format (JSON Schema), containing descriptions, properties, and instructions for how the AI should autonomously reason over DPI-Needed.

## 3. The Other Side (External Orchestration Integration)

The other team (building the ROPA agents) will need to:

1. **Bootstrap Phase (System Prompting/Startup):**
   - The orchestrator app calls \GET /api/v1/agent-tools/scf-controls\ using their M2M Standard Bearer Token.
   - They inject the returned JSON as a "Tool" inside their LLM / LangChain / CrewAI system prompt payload, effectively making the AI aware of the API existence.

2. **Execution Phase (Autonomous Routine):**
   - The AI Auditor examines the ROPA content.
   - It outputs a function call triggered internally: \call_tool("search_scf_controls", {"tags": ["DPI-Needed"], "scfVersionId": "..."})\.
   - The orchestration framework maps this function call back to a generic REST request to our \/api/v1/scf/versions/{scfVersionId}/controls\ endpoint using the tags.
   - They feed the resulting list of Controls back into the agent to reflect and draft the compliance report.

## 4. Risks & Verification
- We must ensure we test the \	ags\ array query deeply in PostgreSQL JSONB parameters.
- We must provide them with the perfect descriptions on the properties (prompt engineering on the tool) so the LLM correctly realizes it should use the generic tool when it identifies a manual risk.

