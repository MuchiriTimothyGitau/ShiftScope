-- supabase/seed.sql
-- ShiftScope — Seed Data
-- Covers full pipeline: project → manifest → scrapes →
-- analysis_jobs → impact_briefs → alert_deliveries.

BEGIN;

-- ----------------------------------------------------------------
-- 1. projects
-- ----------------------------------------------------------------

INSERT INTO projects (id, owner_uid, name, repo_url, created_at) VALUES
(
  '11111111-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000099',
  'demo-webapp',
  'https://github.com/acme/demo-webapp',
  now() - INTERVAL '30 days'
),
(
  '11111111-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000099',
  'demo-api-service',
  'https://github.com/acme/demo-api-service',
  now() - INTERVAL '14 days'
);

-- ----------------------------------------------------------------
-- 2. dependency_manifest
-- ----------------------------------------------------------------

INSERT INTO dependency_manifest
  (id, project_id, name, ecosystem, pinned_version, version_spec,
   is_direct, is_dev, last_scanned_at)
VALUES

('22222222-0000-0000-0000-000000000001',
 '11111111-0000-0000-0000-000000000001',
 'axios', 'npm', '1.7.2', '^1.0.0',
 true, false, now() - INTERVAL '2 hours'),

('22222222-0000-0000-0000-000000000002',
 '11111111-0000-0000-0000-000000000001',
 'lodash', 'npm', '4.17.20', '^4.17.0',
 true, false, now() - INTERVAL '2 hours'),

('22222222-0000-0000-0000-000000000003',
 '11111111-0000-0000-0000-000000000001',
 'express', 'npm', '4.18.2', '^4.0.0',
 true, false, now() - INTERVAL '2 hours'),

('22222222-0000-0000-0000-000000000004',
 '11111111-0000-0000-0000-000000000001',
 'vitest', 'npm', '1.5.3', '^1.0.0',
 false, true, now() - INTERVAL '2 hours'),

('22222222-0000-0000-0000-000000000005',
 '11111111-0000-0000-0000-000000000002',
 'requests', 'pypi', '2.31.0', '>=2.28.0',
 true, false, now() - INTERVAL '1 hour'),

('22222222-0000-0000-0000-000000000006',
 '11111111-0000-0000-0000-000000000002',
 'pydantic', 'pypi', '2.6.4', '>=2.0.0',
 true, false, now() - INTERVAL '1 hour'),

('22222222-0000-0000-0000-000000000007',
 '11111111-0000-0000-0000-000000000002',
 'fastapi', 'pypi', '0.110.3', '>=0.100.0',
 true, false, now() - INTERVAL '1 hour'),

('22222222-0000-0000-0000-000000000008',
 '11111111-0000-0000-0000-000000000002',
 'cryptography', 'pypi', '42.0.5', '>=40.0.0',
 true, false, now() - INTERVAL '1 hour');

-- ----------------------------------------------------------------
-- 3. raw_scrapes
-- ----------------------------------------------------------------

INSERT INTO raw_scrapes
  (id, dep_id, source_type, source_url, raw_html, structured,
   dep_name, old_version, new_version, ecosystem, scraped_at)
VALUES

('33333333-0000-0000-0000-000000000001',
 '22222222-0000-0000-0000-000000000001',
 'github_release',
 'https://github.com/axios/axios/releases/tag/v3.0.0',
 NULL,
 '{
   "tag": "v3.0.0",
   "changelog_text": "## Breaking Changes\n- The `timeout` option has been removed. Use `signal: AbortSignal.timeout(ms)` instead.\n- `axios.spread` helper removed.\n- CommonJS default import changed: `require(''axios'')` now returns ESM-compatible object.\n- Minimum Node.js version bumped to 18.",
   "linked_issues": [
     "https://github.com/axios/axios/issues/5798",
     "https://github.com/axios/axios/pull/6124",
     "https://github.com/axios/axios/issues/5943"
   ]
 }',
 'axios', '1.7.2', '3.0.0', 'npm',
 now() - INTERVAL '90 minutes'),

('33333333-0000-0000-0000-000000000002',
 '22222222-0000-0000-0000-000000000001',
 'github_issues',
 'https://github.com/axios/axios/issues',
 NULL,
 '{
   "issues": [
     {"number": 5798, "title": "Breaking: timeout option removed in v3", "state": "open", "labels": [{"name": "breaking-change"}]},
     {"number": 5943, "title": "CJS require() returns unexpected shape in v3", "state": "open", "labels": [{"name": "regression"}, {"name": "bug"}]}
   ]
 }',
 'axios', '1.7.2', '3.0.0', 'npm',
 now() - INTERVAL '88 minutes'),

('33333333-0000-0000-0000-000000000003',
 '22222222-0000-0000-0000-000000000001',
 'community',
 NULL,
 NULL,
 '{
   "signals": [
     {"query": "axios 3.0.0 breaking change", "title": "Axios 3.0 drops timeout option and CJS support | Hacker News", "url": "https://news.ycombinator.com/item?id=40123456", "date": "2024-05-10"},
     {"query": "site:reddit.com/r/programming axios 3.0.0", "title": "Axios v3 migration is a pain", "url": "https://reddit.com/r/programming/comments/abc123", "date": "2024-05-11"}
   ]
 }',
 'axios', '1.7.2', '3.0.0', 'npm',
 now() - INTERVAL '87 minutes'),

('33333333-0000-0000-0000-000000000004',
 '22222222-0000-0000-0000-000000000001',
 'cve',
 NULL,
 NULL,
 '{
   "signals": [
     {"query": "axios 3.0.0 security vulnerability", "title": "Potential SSRF vector in axios v3 redirect handling", "url": "https://huntr.com/bounties/xxxx-axios-v3-ssrf", "date": "2024-05-09", "cve_ids": [], "credibility": 0.8}
   ]
 }',
 'axios', '1.7.2', '3.0.0', 'npm',
 now() - INTERVAL '87 minutes'),

('33333333-0000-0000-0000-000000000005',
 '22222222-0000-0000-0000-000000000001',
 'registry',
 'https://www.npmjs.com/package/axios',
 NULL,
 '{
   "name": "axios", "ecosystem": "npm", "latest_version": "3.0.0",
   "deprecated": false, "weekly_downloads": 48500000
 }',
 'axios', '1.7.2', '3.0.0', 'npm',
 now() - INTERVAL '86 minutes'),

('33333333-0000-0000-0000-000000000006',
 '22222222-0000-0000-0000-000000000008',
 'cve',
 NULL,
 NULL,
 '{
   "signals": [
     {"query": "cryptography 42.0.5 CVE vulnerability", "title": "CVE-2024-26130: NULL pointer dereference in PKCS12 serialisation", "url": "https://nvd.nist.gov/vuln/detail/CVE-2024-26130", "date": "2024-02-21", "cve_ids": ["CVE-2024-26130"], "credibility": 1.0}
   ]
 }',
 'cryptography', '42.0.5', '42.0.6', 'pypi',
 now() - INTERVAL '60 minutes');

-- ----------------------------------------------------------------
-- 4. analysis_jobs
-- ----------------------------------------------------------------

INSERT INTO analysis_jobs
  (id, scrape_id, status, created_at)
VALUES
('44444444-0000-0000-0000-000000000001',
 '33333333-0000-0000-0000-000000000001',
 'pending',
 now() - INTERVAL '85 minutes'),
('44444444-0000-0000-0000-000000000002',
 '33333333-0000-0000-0000-000000000006',
 'pending',
 now() - INTERVAL '58 minutes');

-- ----------------------------------------------------------------
-- 5. impact_briefs
-- ----------------------------------------------------------------

INSERT INTO impact_briefs
  (id, dep_id, dep_name, old_version, new_version, severity, summary,
   breaking_changes, pre_cve_signals, estimated_fix_minutes,
   safe_to_upgrade, chain_trace, created_at)
VALUES
(
  '55555555-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'axios',
  '1.7.2',
  '3.0.0',
  'critical',
  'axios 3.0.0 removes the timeout option (replace with AbortSignal.timeout), drops axios.spread, and changes the CommonJS require() shape. A potential SSRF vector in redirect handling disclosed but not yet assigned a CVE.',

  '[
    {
      "description": "The timeout option has been removed from request config",
      "affected_pattern": "axios.get(url, { timeout: 5000 })",
      "before_code": "await axios.get(url, { timeout: 5000 });",
      "after_code": "await axios.get(url, { signal: AbortSignal.timeout(5000) });",
      "fix_description": "Replace the timeout option with AbortSignal.timeout()",
      "file_hint": "src/**/*.{js,ts}",
      "estimated_minutes": 15,
      "confidence": "confirmed",
      "source_url": "https://github.com/axios/axios/issues/5798"
    },
    {
      "description": "axios.spread() helper has been removed",
      "affected_pattern": "axios.spread(function(acct, perms) { ... })",
      "before_code": "axios.all([req1, req2]).then(axios.spread((r1, r2) => { ... }));",
      "after_code": "Promise.all([req1, req2]).then(([r1, r2]) => { ... });",
      "fix_description": "Replace axios.all + axios.spread with Promise.all and array destructuring",
      "file_hint": "src/**/*.{js,ts}",
      "estimated_minutes": 10,
      "confidence": "confirmed"
    },
    {
      "description": "CommonJS require() no longer returns the axios instance directly",
      "affected_pattern": "const axios = require(''axios'')",
      "before_code": "const axios = require(''axios'');",
      "after_code": "const axios = require(''axios'').default;",
      "fix_description": "Add .default when using CommonJS require()",
      "file_hint": "**/*.cjs",
      "estimated_minutes": 5,
      "confidence": "likely",
      "source_url": "https://github.com/axios/axios/issues/5943"
    }
  ]',

  '[
    {
      "url": "https://huntr.com/bounties/xxxx-axios-v3-ssrf",
      "title": "Potential SSRF vector in axios v3 redirect handling",
      "date": "2024-05-09",
      "credibility_score": 0.8,
      "cve_ids": []
    }
  ]',

  30,
  true,

  '{
    "step1": { "model": "gemini-1.5-flash", "tokens_used": 412 },
    "step2": { "model": "gemini-1.5-pro",   "tokens_used": 2841 },
    "step3": { "model": "gemini-1.5-pro",   "tokens_used": 3102 },
    "step4": { "model": "gemini-1.5-pro",   "tokens_used": 4550 },
    "step5": { "model": "gemini-1.5-flash", "tokens_used": 298 }
  }',

  now() - INTERVAL '60 minutes'
);

-- ----------------------------------------------------------------
-- 6. alert_deliveries
-- ----------------------------------------------------------------

INSERT INTO alert_deliveries
  (id, brief_id, channel, status, delivered_at)
VALUES
('66666666-0000-0000-0000-000000000001',
 '55555555-0000-0000-0000-000000000001',
 'slack',
 'sent',
 now() - INTERVAL '59 minutes'),
('66666666-0000-0000-0000-000000000002',
 '55555555-0000-0000-0000-000000000001',
 'dashboard',
 'sent',
 now() - INTERVAL '59 minutes');

COMMIT;
