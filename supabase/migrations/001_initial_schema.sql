-- ShiftScope initial schema

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  repo_url    TEXT,
  owner_uid   UUID,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE dependency_manifest (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  ecosystem       TEXT NOT NULL,
  pinned_version  TEXT NOT NULL,
  version_spec    TEXT,
  is_direct       BOOLEAN DEFAULT true,
  is_dev          BOOLEAN DEFAULT false,
  last_scanned_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE raw_scrapes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dep_id         UUID REFERENCES dependency_manifest(id),
  source_type    TEXT NOT NULL,
  source_url     TEXT,
  raw_html       TEXT,
  structured     JSONB,
  dep_name       TEXT,
  old_version    TEXT,
  new_version    TEXT,
  ecosystem      TEXT,
  scraped_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE impact_briefs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dep_id            UUID REFERENCES dependency_manifest(id),
  dep_name          TEXT,
  old_version       TEXT NOT NULL,
  new_version       TEXT NOT NULL,
  severity          TEXT NOT NULL,
  summary           TEXT,
  breaking_changes  JSONB,
  pre_cve_signals   JSONB,
  estimated_fix_minutes INT,
  safe_to_upgrade   BOOLEAN,
  chain_trace       JSONB,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alert_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id     UUID REFERENCES impact_briefs(id),
  channel      TEXT NOT NULL,
  status       TEXT,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_manifest_project ON dependency_manifest(project_id);
CREATE INDEX idx_scrapes_dep ON raw_scrapes(dep_id);
CREATE INDEX idx_briefs_dep ON impact_briefs(dep_id);
CREATE INDEX idx_briefs_severity ON impact_briefs(severity);
CREATE INDEX idx_deliveries_brief ON alert_deliveries(brief_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY project_owner_only ON projects
  FOR ALL USING (auth.uid() = owner_uid);

ALTER TABLE dependency_manifest ENABLE ROW LEVEL SECURITY;
CREATE POLICY manifest_via_project ON dependency_manifest
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE owner_uid = auth.uid())
  );
