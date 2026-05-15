"""
Standard API — Python Client Example

Demonstrates how to integrate with the Standard API from a Python application.

Requirements:
    pip install httpx

Usage:
    STANDARD_API_KEY=sk-your-key python examples/python/client.py
"""

import os
import sys
import json
from datetime import date

try:
    import httpx
except ImportError:
    print("❌ Install httpx: pip install httpx")
    sys.exit(1)


BASE_URL = os.getenv("STANDARD_API_URL", "https://standard-api-gateway-production.ness.workers.dev")
API_KEY = os.getenv("STANDARD_API_KEY", "")
ORG_ID = os.getenv("STANDARD_ORG_ID", "your-organization-id")

if not API_KEY:
    print("❌ Set STANDARD_API_KEY environment variable")
    sys.exit(1)


class StandardClient:
    """Minimal typed client for the Standard API."""

    def __init__(self, base_url: str, api_key: str):
        self.client = httpx.Client(
            base_url=base_url,
            headers={
                "Authorization": f"ApiKey {api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    def health(self) -> dict:
        """Health check (no auth required)."""
        r = httpx.get(f"{BASE_URL}/health")
        r.raise_for_status()
        return r.json()

    def list_frameworks(self, limit: int = 5) -> list[dict]:
        """List available compliance frameworks."""
        r = self.client.get("/api/v1/scf/frameworks", params={"limit": limit})
        r.raise_for_status()
        return r.json()["data"]

    def get_latest_scf_version(self) -> dict:
        """Get the latest SCF catalog version."""
        r = self.client.get("/api/v1/scf/versions/latest")
        r.raise_for_status()
        return r.json()

    def create_assessment(self, org_id: str, name: str, scf_version_id: str) -> dict:
        """Create a new compliance assessment."""
        r = self.client.post("/api/v1/assessments", json={
            "organization_id": org_id,
            "name": name,
            "scf_version_id": scf_version_id,
        })
        r.raise_for_status()
        return r.json()

    def get_assessment(self, assessment_id: str) -> dict:
        """Get assessment details."""
        r = self.client.get(f"/api/v1/assessments/{assessment_id}")
        r.raise_for_status()
        return r.json()

    def get_available_transitions(self, assessment_id: str) -> dict:
        """Get available lifecycle transitions for an assessment."""
        r = self.client.get(f"/api/v1/assessments/{assessment_id}/available-transitions")
        r.raise_for_status()
        return r.json()

    def transition(self, assessment_id: str, next_state: str) -> dict:
        """Execute a lifecycle state transition."""
        r = self.client.post(f"/api/v1/assessments/{assessment_id}/transitions", json={
            "next_state": next_state,
        })
        r.raise_for_status()
        return r.json()

    def upload_document(self, assessment_id: str, file_path: str, description: str = "") -> dict:
        """Upload a document for evidence analysis."""
        with open(file_path, "rb") as f:
            r = self.client.post(
                f"/api/v1/assessments/{assessment_id}/documents",
                files={"file": (os.path.basename(file_path), f)},
                data={"description": description},
                headers={"Content-Type": None},  # let httpx set multipart
            )
        r.raise_for_status()
        return r.json()


def main():
    print("🔬 Standard API — Python Client Example\n")

    client = StandardClient(BASE_URL, API_KEY)

    # 1. Health check
    health = client.health()
    print(f"✅ Health: {health['status']}")

    # 2. Get latest SCF version
    scf = client.get_latest_scf_version()
    print(f"✅ SCF Version: {scf.get('version_label', 'unknown')} ({scf['scf_version_id']})")

    # 3. List frameworks
    frameworks = client.list_frameworks(limit=5)
    print(f"✅ Frameworks: {len(frameworks)} loaded")
    for fw in frameworks:
        print(f"   - {fw['name']} ({fw.get('requirement_count', '?')} requirements)")

    # 4. Create assessment
    assessment = client.create_assessment(
        org_id=ORG_ID,
        name=f"Python Example - {date.today().isoformat()}",
        scf_version_id=scf["scf_version_id"],
    )
    aid = assessment["assessment_id"]
    print(f"✅ Assessment created: {aid} (state: {assessment['state']})")

    # 5. Check available transitions
    transitions = client.get_available_transitions(aid)
    print(f"✅ Available transitions: {', '.join(transitions['available_transitions'])}")

    print("\n🎉 Done! Continue the lifecycle by uploading documents and transitioning states.")


if __name__ == "__main__":
    main()
