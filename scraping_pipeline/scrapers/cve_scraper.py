#!/usr/bin/env python3
import asyncio
import os
import httpx
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-supabase-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

class CVEScraper:
    def __init__(self):
        if not SUPABASE_KEY:
            raise ValueError("Supabase authentication credentials missing. Please set SUPABASE_KEY.")
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.osv_url = "https://api.osv.dev/v1/query"

    """
Map database ecosystems to standard OSV ecosystem names
    """
    def _map_ecosystem(self, db_ecosystem: str) -> str:
        mapping = {
            "npm": "npm",
            "pypi": "PyPI",
            "cargo": "Crates.io",
            "go": "Go",
            "rubygems": "RubyGems",
            "maven": "Maven"
        }
        return mapping.get(db_ecosystem.lower(), db_ecosystem)

    async def fetch_vulnerabilities(self, client: httpx.AsyncClient, manifest_id: str, package_name: str, version: str, ecosystem: str):
        payload = {
            "version": version,
            "package": {
                "name": package_name,
                "ecosystem": self._map_ecosystem(ecosystem)
            }
        }
        
        try:
            print(f"[CVE Scraper] Querying OSV for {package_name} ({version}) in {ecosystem}...")
            response = await client.post(self.osv_url, json=payload, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                vulns = data.get("vulns", [])
                
                if not vulns:
                    print(f"[CVE Scraper] No vulnerabilities found for {package_name} ({version}).")
                    return
                
                print(f"[CVE Scraper] Found {len(vulns)} vulnerabilities for {package_name}!")
                
                # Format the CVE data as structured text context for the AI
                formatted_text = f"Vulnerability Scan Report for {package_name} (version {version})\n"
                formatted_text += "=" * 60 + "\n"
                
                for vuln in vulns:
                    vuln_id = vuln.get("id", "Unknown ID")
                    summary = vuln.get("summary", "No summary provided.")
                    details = vuln.get("details", "No details available.")
                    aliases = ", ".join(vuln.get("aliases", []))
                    
                    formatted_text += f"ID: {vuln_id}\n"
                    if aliases:
                        formatted_text += f"Aliases: {aliases}\n"
                    formatted_text += f"Summary: {summary}\n"
                    formatted_text += f"Details: {details}\n"
                    
                    # Add reference links
                    references = vuln.get("references", [])
                    if references:
                        formatted_text += "References:\n"
                        for ref in references:
                            formatted_text += f"  - [{ref.get('type')}] {ref.get('url')}\n"
                    formatted_text += "-" * 40 + "\n"

                # Insert raw scrape into Supabase
                scrape_payload = {
                    "manifest_id": manifest_id,
                    "url": f"https://osv.dev/vulnerability/{vulns[0].get('id')}",
                    "html_content": response.text,
                    "raw_text": formatted_text,
                    "source_type": "cve_feed"
                }
                
                self.supabase.table("raw_scrapes").insert(scrape_payload).execute()
                print(f"[CVE Scraper] Successfully persisted CVE context for {package_name}.")
            else:
                print(f"[CVE Scraper] OSV API returned status {response.status_code} for {package_name}.")
        
        except Exception as e:
            print(f"[CVE Scraper] Failed to fetch vulnerabilities for {package_name}: {str(e)}")

    async def run(self):
        print("[CVE Scraper] Starting vulnerability fetch cycle...")
        
        # 1. Retrieve all trackable dependencies from Supabase
        try:
            query = self.supabase.table("dependency_manifest").select("id, name, pinned_version, ecosystem").execute()
            dependencies = query.data
        except Exception as e:
            print(f"[CVE Scraper] Database access error: {str(e)}")
            return

        if not dependencies:
            print("[CVE Scraper] No dependency manifests found to scan.")
            return

        print(f"[CVE Scraper] Found {len(dependencies)} manifests to process.")

        # 2. Process concurrently using httpx
        async with httpx.AsyncClient() as client:
            tasks = []
            for dep in dependencies:
                tasks.append(
                    self.fetch_vulnerabilities(
                        client,
                        manifest_id=dep["id"],
                        package_name=dep["name"],
                        version=dep["pinned_version"],
                        ecosystem=dep["ecosystem"]
                    )
                )
            await asyncio.gather(*tasks)
            
        print("[CVE Scraper] Completed vulnerability scan cycle successfully.")

if __name__ == "__main__":
    scraper = CVEScraper()
    asyncio.run(scraper.run())
