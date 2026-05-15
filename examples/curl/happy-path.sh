#!/bin/bash
# Standard API — Complete Assessment Happy Path
# 
# This script demonstrates the full 10-step assessment lifecycle.
# Replace BASE_URL and API_KEY with your credentials.
#
# Usage: bash happy-path.sh

set -euo pipefail

BASE_URL="${STANDARD_API_URL:-https://standard-api-gateway-production.ness.workers.dev}"
API_KEY="${STANDARD_API_KEY:-sk-your-api-key}"
ORG_ID="${STANDARD_ORG_ID:-your-organization-id}"

H_AUTH="Authorization: ApiKey $API_KEY"
H_JSON="Content-Type: application/json"

echo "╔══════════════════════════════════════════════════╗"
echo "║  Standard API — Assessment Happy Path           ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── Step 0: Health check ─────────────────────────────────
echo "▸ Step 0: Health check"
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

# ── Step 1: Get latest SCF version ───────────────────────
echo "▸ Step 1: Get latest SCF version"
SCF_VERSION=$(curl -s -H "$H_AUTH" "$BASE_URL/api/v1/scf/versions/latest" | python3 -c "import json,sys; print(json.load(sys.stdin)['scf_version_id'])")
echo "  SCF Version: $SCF_VERSION"
echo ""

# ── Step 2: List available frameworks ────────────────────
echo "▸ Step 2: List frameworks (first 5)"
curl -s -H "$H_AUTH" "$BASE_URL/api/v1/scf/frameworks?limit=5" | python3 -m json.tool
echo ""

# ── Step 3: Create assessment ────────────────────────────
echo "▸ Step 3: Create assessment"
ASSESSMENT=$(curl -s -X POST \
  -H "$H_AUTH" -H "$H_JSON" \
  -d "{
    \"organization_id\": \"$ORG_ID\",
    \"name\": \"API Example Assessment - $(date +%Y%m%d)\",
    \"scf_version_id\": \"$SCF_VERSION\"
  }" \
  "$BASE_URL/api/v1/assessments")
ASSESSMENT_ID=$(echo "$ASSESSMENT" | python3 -c "import json,sys; print(json.load(sys.stdin)['assessment_id'])")
echo "  Assessment ID: $ASSESSMENT_ID"
echo "  State: draft"
echo ""

# ── Step 4: Check available transitions ──────────────────
echo "▸ Step 4: Available transitions from 'draft'"
curl -s -H "$H_AUTH" "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID/available-transitions" | python3 -m json.tool
echo ""

# ── Step 5: Upload a document ────────────────────────────
echo "▸ Step 5: Upload evidence document"
if [ -f "./sample-policy.pdf" ]; then
  curl -s -X POST \
    -H "$H_AUTH" \
    -F "file=@./sample-policy.pdf" \
    -F "description=Sample security policy" \
    "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID/documents" | python3 -m json.tool
else
  echo "  ⚠ No sample-policy.pdf found. Skipping upload."
  echo "  Create a file named sample-policy.pdf to test document upload."
fi
echo ""

# ── Step 6: Transition to documents_uploaded ─────────────
echo "▸ Step 6: Transition → documents_uploaded"
curl -s -X POST \
  -H "$H_AUTH" -H "$H_JSON" \
  -d '{ "next_state": "documents_uploaded" }' \
  "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID/transitions" | python3 -m json.tool
echo ""

# ── Step 7: Get assessment status ────────────────────────
echo "▸ Step 7: Current status"
curl -s -H "$H_AUTH" "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID/status" | python3 -m json.tool
echo ""

# ── Step 8: View assessment timeline ─────────────────────
echo "▸ Step 8: Timeline"
curl -s -H "$H_AUTH" "$BASE_URL/api/v1/assessments/$ASSESSMENT_ID/timeline" | python3 -m json.tool
echo ""

echo "╔══════════════════════════════════════════════════╗"
echo "║  ✅ Happy path steps 0-8 complete.              ║"
echo "║                                                  ║"
echo "║  Continue the lifecycle by:                      ║"
echo "║  • Selecting a framework (transition)            ║"
echo "║  • Drafting SoA                                  ║"
echo "║  • Running evidence analysis                     ║"
echo "║  • Generating reports                            ║"
echo "║                                                  ║"
echo "║  See: docs/getting-started.md                    ║"
echo "╚══════════════════════════════════════════════════╝"
