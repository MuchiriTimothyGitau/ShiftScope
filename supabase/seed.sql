-- ShiftScope Demo Seed Data
-- Compatible with 001_initial_schema.sql

TRUNCATE TABLE alert_deliveries, impact_briefs, raw_scrapes, dependency_manifest, projects RESTART IDENTITY CASCADE;

INSERT INTO projects (id, name, repo_url) VALUES
('b3c8f8b4-efda-4fae-bd42-f54e60157ea1', 'Alpha-Commerce-Gateway', 'https://github.com/alphacorp/commerce-gateway'),
('b3c8f8b4-efda-4fae-bd42-f54e60157ea2', 'Nexus-Developer-Portal', 'https://github.com/nexus/dev-portal');

INSERT INTO dependency_manifest (id, project_id, name, ecosystem, pinned_version, version_spec, is_direct, is_dev, last_scanned_at) VALUES
('d11111111-1111-1111-1111-111111111111', 'b3c8f8b4-efda-4fae-bd42-f54e60157ea1', 'axios', 'npm', '1.6.8', '^1.6.0', true, false, now() - interval '5 minutes'),
('d22222222-2222-2222-2222-222222222222', 'b3c8f8b4-efda-4fae-bd42-f54e60157ea1', 'lodash', 'npm', '4.17.20', '^4.17.0', true, false, now() - interval '4 minutes'),
('d33333333-3333-3333-3333-333333333333', 'b3c8f8b4-efda-4fae-bd42-f54e60157ea2', 'react', 'npm', '18.2.0', '^18.0.0', true, false, now() - interval '3 minutes'),
('d44444444-4444-4444-4444-444444444444', 'b3c8f8b4-efda-4fae-bd42-f54e60157ea2', 'express', 'npm', '4.18.2', '^4.18.0', true, false, now() - interval '2 minutes');

INSERT INTO raw_scrapes (dep_id, source_type, source_url, raw_html, structured, dep_name, old_version, new_version, ecosystem) VALUES
('d11111111-1111-1111-1111-111111111111', 'github_release',
 'https://github.com/axios/axios/releases/tag/v1.6.8',
 '<html><body><h1>Release v1.6.0</h1><p>Breaking change: Custom adapters now require an options object instead of raw config parameters.</p></body></html>',
 '{"changelog_text": "Breaking change: Custom adapters now require an options object instead of raw config parameters.", "issues_text": "", "community_snippets": "", "pre_cve_signals": []}'::jsonb,
 'axios', '1.6.7', '1.6.8', 'npm'),

('d11111111-1111-1111-1111-111111111111', 'github_issue',
 'https://github.com/axios/axios/issues/6005',
 '<html><body><span class=\"label\">breaking</span><p>Custom adapter interface breaks on version v1.6.0</p></body></html>',
 '{"changelog_text": "", "issues_text": "Custom adapter interface breaks on version v1.6.0, returning undefined config parameters.", "community_snippets": "", "pre_cve_signals": []}'::jsonb,
 'axios', '1.6.7', '1.6.8', 'npm'),

('d22222222-2222-2222-2222-222222222222', 'cve_feed',
 'https://nvd.nist.gov/vuln/detail/CVE-2020-28500',
 '<html><body><h1>CVE-2020-28500</h1><p>Lodash prior to 4.17.21 vulnerable to Prototype Pollution via defaultsDeep.</p></body></html>',
 '{"changelog_text": "", "issues_text": "", "community_snippets": "CVE-2020-28500: Prototype Pollution via defaultsDeep", "pre_cve_signals": [{"url": "https://nvd.nist.gov/vuln/detail/CVE-2020-28500", "title": "CVE-2020-28500", "date": "2025-01-15", "credibility_score": 0.95}]}'::jsonb,
 'lodash', '4.17.20', '4.17.21', 'npm'),

('d33333333-3333-3333-3333-333333333333', 'maintainer_blog',
 'https://react.dev/blog/2024/12/05/react-19',
 '<html><body><h1>React 19 Is Now Available</h1><p>Function components no longer require defaultProps. Legacy context, string refs, and findDOMNode removed.</p></body></html>',
 '{"changelog_text": "React 19 removes legacy context API, string refs, and findDOMNode. Function components no longer require defaultProps.", "issues_text": "", "community_snippets": "", "pre_cve_signals": []}'::jsonb,
 'react', '18.2.0', '19.0.0', 'npm');

INSERT INTO impact_briefs (dep_id, dep_name, old_version, new_version, severity, summary, breaking_changes, pre_cve_signals, estimated_fix_minutes, safe_to_upgrade, chain_trace) VALUES
('d11111111-1111-1111-1111-111111111111', 'axios', '1.6.7', '1.6.8', 'high',
 'Axios v1.6.8 introduces a breaking change in its custom adapter interface. Custom adapters must now accept an options object parameter.',
 '[{"description": "Custom adapter signature changed", "affected_pattern": "axios.create({ adapter: ... })", "before_code": "const myAdapter = (config) => { ... }", "after_code": "const myAdapter = (config, options) => { ... }", "fix_description": "Add second options parameter to custom adapter functions", "file_hint": "src/**/network.ts", "estimated_minutes": 15}]'::jsonb,
 '[{"url": "https://github.com/axios/axios/issues/6005", "title": "Custom adapter interface regression", "date": "2025-03-10", "credibility_score": 0.85}]'::jsonb,
 15, false,
 '[{"step1": {"prompt": "Summarise changelog for axios...", "response": "Axios 1.6.8 modifies custom adapter interface."}, "step2": {"prompt": "Extract breaking changes...", "response": "Found 1 breaking change: custom adapter signature."}}]'::jsonb),

('d22222222-2222-2222-2222-222222222222', 'lodash', '4.17.20', '4.17.21', 'high',
 'Upgrading Lodash to v4.17.21 patches critical prototype pollution exploit in defaultsDeep. Zero API contract breakages.',
 '[]'::jsonb,
 '[{"url": "https://nvd.nist.gov/vuln/detail/CVE-2020-28500", "title": "CVE-2020-28500", "date": "2025-01-15", "credibility_score": 0.95}]'::jsonb,
 5, true,
 '[{"step1": {"prompt": "Summarise lodash 4.17.21 changes...", "response": "Security patch release. No breaking changes."}}]'::jsonb),

('d33333333-3333-3333-3333-333333333333', 'react', '18.2.0', '19.0.0', 'high',
 'React 19 removes legacy context API, string refs, and findDOMNode. defaultProps deprecated in favor of ES6 default parameters.',
 '[{"description": "Legacy context API removed", "affected_pattern": "contextTypes / childContextTypes", "before_code": "class Foo extends React.Component { static contextTypes = { ... } }", "after_code": "Use React.createContext() hooks pattern", "fix_description": "Migrate from legacy context to createContext API", "file_hint": "src/**/components/*.jsx", "estimated_minutes": 30}]'::jsonb,
 '[]'::jsonb,
 30, true,
 '[{"step1": {"prompt": "Summarise React 19 changes...", "response": "React 19 removes deprecated legacy APIs."}}]'::jsonb);
