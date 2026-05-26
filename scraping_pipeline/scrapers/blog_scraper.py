#!/usr/bin/env python3
import asyncio
import os
import xml.etree.ElementTree as ET
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-supabase-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

class BlogScraper:
    def __init__(self):
        if not SUPABASE_KEY:
            raise ValueError("Supabase authentication credentials missing. Please set SUPABASE_KEY.")
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        # Mapping package names to their official update RSS/Atom feeds or release blogs
        self.blog_feed_registry = {
            "react": "https://react.dev/feed.xml",
            "lodash": "https://github.com/lodash/lodash/releases.atom",
            "axios": "https://github.com/axios/axios/releases.atom",
            "express": "https://github.com/expressjs/express/releases.atom"
        }

    """
Sanitizes raw HTML, removing layout wrappers, script files, and stylesheet nodes
    """
    def _clean_html_to_text(self, html_content: str) -> str:
        soup = BeautifulSoup(html_content, "html.parser")
        
        # Remove script and style elements
        for element in soup(["script", "style", "nav", "footer", "header", "noscript"]):
            element.decompose()
            
        # Get clean text
        text = soup.get_text(separator="\n")
        
        # Break into lines and remove empty margins
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        return "\n".join(lines)

    async def fetch_blog_context(self, client: httpx.AsyncClient, manifest_id: str, package_name: str):
        feed_url = self.blog_feed_registry.get(package_name.lower())
        
        # Fallback feed generator using GitHub Atom releases if no custom feed is present
        if not feed_url:
            feed_url = f"https://github.com/{package_name}/{package_name}/releases.atom"

        try:
            print(f"[Blog Scraper] Scanning update feed for {package_name} at {feed_url}...")
            response = await client.get(feed_url, timeout=12.0, follow_redirects=True)
            
            if response.status_code != 200:
                print(f"[Blog Scraper] Feed request returned status {response.status_code} for {package_name}.")
                return

            articles = []
            
            # 1. Process Atom/RSS XML structures
            if "xml" in response.headers.get("content-type", "") or feed_url.endswith(".xml") or feed_url.endswith(".atom"):
                try:
                    root = ET.fromstring(response.content)
                    
                    # Parse Atom Namespace
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    
                    # Look for <entry> (Atom) or <item> (RSS)
                    entries = root.findall(".//atom:entry", ns) or root.findall(".//entry") or root.findall(".//item")
                    
                    for entry in entries[:2]: # Get latest 2 articles/releases
                        title_el = entry.find("atom:title", ns) or entry.find("title")
                        content_el = entry.find("atom:content", ns) or entry.find("atom:summary", ns) or entry.find("description")
                        link_el = entry.find("atom:link", ns) or entry.find("link")
                        
                        title = title_el.text if title_el is not None else "Release Update"
                        content_raw = content_el.text if content_el is not None else ""
                        
                        href = feed_url
                        if link_el is not None:
                            href = link_el.attrib.get("href") or link_el.text or feed_url
                            
                        clean_text = self._clean_html_to_text(content_raw) if content_raw else "No description parsed."
                        
                        articles.append({
                            "title": title,
                            "url": href,
                            "raw_text": f"Update: {title}\nSource: {href}\n\nContent:\n{clean_text}"
                        })
                except Exception as xml_err:
                    print(f"[Blog Scraper] XML Parsing failed for {package_name}: {str(xml_err)}")
            
            # 2. Process Static HTML blogs as fallback
            if not articles:
                clean_text = self._clean_html_to_text(response.text)
                articles.append({
                    "title": f"{package_name} Latest Update Summary",
                    "url": feed_url,
                    "raw_text": f"Release updates fetched for {package_name}.\nSource: {feed_url}\n\n{clean_text[:5000]}"
                })

            # 3. Persist the scraped documents to Supabase raw_scrapes
            for article in articles:
                scrape_payload = {
                    "manifest_id": manifest_id,
                    "url": article["url"],
                    "html_content": response.text[:50000], # Keep HTML chunk within reasonable bounds
                    "raw_text": article["raw_text"],
                    "source_type": "maintainer_blog"
                }
                
                self.supabase.table("raw_scrapes").insert(scrape_payload).execute()
                print(f"[Blog Scraper] Persisted article '{article['title']}' for {package_name}.")

        except Exception as e:
            print(f"[Blog Scraper] Failed to fetch blog updates for {package_name}: {str(e)}")

    async def run(self):
        print("[Blog Scraper] Launching release blog and feed scraping lifecycle...")
        
        # 1. Fetch scanned package list from manifest
        try:
            query = self.supabase.table("dependency_manifest").select("id, name").execute()
            dependencies = query.data
        except Exception as e:
            print(f"[Blog Scraper] Database access error: {str(e)}")
            return

        if not dependencies:
            print("[Blog Scraper] No dependency manifests found to scan.")
            return

        print(f"[Blog Scraper] Ingested {len(dependencies)} packages to check.")

        # 2. Core concurrent pipeline execution
        async with httpx.AsyncClient() as client:
            tasks = []
            for dep in dependencies:
                tasks.append(
                    self.fetch_blog_context(client, manifest_id=dep["id"], package_name=dep["name"])
                )
            await asyncio.gather(*tasks)

        print("[Blog Scraper] Maintainer blog scanning completed successfully.")

if __name__ == "__main__":
    scraper = BlogScraper()
    asyncio.run(scraper.run())
