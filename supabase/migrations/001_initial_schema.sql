-- supabase/migrations/001_initial_schema.sql
-- ============================================================
-- ShiftScope — Full Database Schema
-- Merged: Ishrak's normalized schema + denormalized convenience
-- columns (dep_name, old_version, new_version, ecosystem) so
-- existing TypeScript code works without JOIN changes.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------
-- 1. projects
-- ----------------------------------------------------------------
CREATE TABLE projects (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid   UUID        NOT NULL,
  name        TEXT        NOT NULL,
  repo_url    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT projects_name_not_empty CHECK (char_length(name) > 0)
);

-- ----------------------------------------------------------------
-- 2. dependency_manifest
-- ----------------------------------------------------------------
CREATE TABLE dependency_manifest (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  ecosystem       TEXT        NOT NULL,
  pinned_version  TEXT        NOT NULL,
  version_spec    TEXT,
  is_direct       BOOLEAN     NOT NULL DEFAULT true,
  is_dev          BOOLEAN     NOT NULL DEFAULT false,
  resolved_url    TEXT,
  integrity       TEXT,
  last_scanned_at TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT manifest_ecosystem_valid CHECK (
    ecosystem IN ('npm', 'pypi', 'crates', 'go', 'gem', 'maven')
  ),
  UNIQUE (project_id, name, ecosystem)
);

-- ----------------------------------------------------------------
-- 3. raw_scrapes
-- ----------------------------------------------------------------
CREATE TABLE raw_scrapes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dep_id       UUID        NOT NULL REFERENCES dependency_manifest(id) ON DELETE CASCADE,
  source_type  TEXT        NOT NULL,
  source_url   TEXT,
  raw_html     TEXT,
  structured   JSONB       NOT NULL DEFAULT '{}',
  dep_name     TEXT,
  old_version  TEXT,
  new_version  TEXT,
  ecosystem    TEXT,
  scraped_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT raw_scrapes_source_type_valid CHECK (
    source_type IN (
      'registry', 'github_release', 'github_issues',
      'cve', 'community', 'maintainer'
    )
  )
);

-- ----------------------------------------------------------------
-- 4. analysis_jobs
-- ----------------------------------------------------------------
CREATE TABLE analysis_jobs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_id     UUID        NOT NULL REFERENCES raw_scrapes(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  error_message TEXT,

  CONSTRAINT analysis_jobs_status_valid CHECK (
    status IN ('pending', 'processing', 'completed', 'failed')
  )
);

-- ----------------------------------------------------------------
-- 5. impact_briefs
-- ----------------------------------------------------------------
CREATE TABLE impact_briefs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  dep_id                UUID        NOT NULL REFERENCES dependency_manifest(id) ON DELETE CASCADE,
  dep_name              TEXT,
  old_version           TEXT        NOT NULL,
  new_version           TEXT        NOT NULL,
  severity              TEXT        NOT NULL,
  summary               TEXT,
  breaking_changes      JSONB       NOT NULL DEFAULT '[]',
  pre_cve_signals       JSONB       NOT NULL DEFAULT '[]',
  estimated_fix_minutes INT         NOT NULL DEFAULT 0,
  safe_to_upgrade       BOOLEAN     NOT NULL DEFAULT true,
  chain_trace           JSONB       NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT impact_briefs_severity_valid CHECK (
    severity IN ('critical', 'high', 'medium', 'low')
  ),
  CONSTRAINT impact_briefs_fix_minutes_positive CHECK (
    estimated_fix_minutes >= 0
  )
);

-- ----------------------------------------------------------------
-- 6. alert_deliveries
-- ----------------------------------------------------------------
CREATE TABLE alert_deliveries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id     UUID        NOT NULL REFERENCES impact_briefs(id) ON DELETE CASCADE,
  channel      TEXT        NOT NULL,
  status       TEXT        NOT NULL DEFAULT 'sent',
  delivered_at TIMESTAMPTZ,
  error_detail TEXT,

  CONSTRAINT alert_deliveries_channel_valid CHECK (
    channel IN ('slack', 'email', 'webhook', 'dashboard')
  ),
  CONSTRAINT alert_deliveries_status_valid CHECK (
    status IN ('sent', 'failed', 'suppressed')
  )
);

-- ================================================================
-- INDEXES
-- ================================================================

CREATE INDEX idx_manifest_project
  ON dependency_manifest(project_id);

CREATE INDEX idx_manifest_last_scanned
  ON dependency_manifest(last_scanned_at NULLS FIRST);

CREATE INDEX idx_manifest_name_ecosystem
  ON dependency_manifest(name, ecosystem);

CREATE INDEX idx_manifest_name_trgm
  ON dependency_manifest USING gin (name gin_trgm_ops);

CREATE INDEX idx_scrapes_dep
  ON raw_scrapes(dep_id);

CREATE INDEX idx_analysis_jobs_pending
  ON analysis_jobs(status, created_at)
  WHERE status = 'pending';

CREATE INDEX idx_briefs_severity
  ON impact_briefs(severity);

CREATE INDEX idx_briefs_dep
  ON impact_briefs(dep_id, created_at DESC);

CREATE INDEX idx_briefs_created
  ON impact_briefs(created_at DESC);

CREATE INDEX idx_deliveries_brief
  ON alert_deliveries(brief_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE projects              ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependency_manifest   ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_scrapes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE impact_briefs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_deliveries      ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_owner_only ON projects
  FOR ALL
  USING (auth.uid() = owner_uid)
  WITH CHECK (auth.uid() = owner_uid);

CREATE POLICY manifest_via_project ON dependency_manifest
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_uid = auth.uid()
    )
  );

CREATE POLICY scrapes_via_project ON raw_scrapes
  FOR ALL
  USING (
    dep_id IN (
      SELECT dm.id
      FROM dependency_manifest dm
      JOIN projects p ON p.id = dm.project_id
      WHERE p.owner_uid = auth.uid()
    )
  );

CREATE POLICY analysis_jobs_via_project ON analysis_jobs
  FOR ALL
  USING (
    scrape_id IN (
      SELECT rs.id
      FROM raw_scrapes rs
      JOIN dependency_manifest dm ON dm.id = rs.dep_id
      JOIN projects p ON p.id = dm.project_id
      WHERE p.owner_uid = auth.uid()
    )
  );

CREATE POLICY briefs_via_project ON impact_briefs
  FOR ALL
  USING (
    dep_id IN (
      SELECT dm.id
      FROM dependency_manifest dm
      JOIN projects p ON p.id = dm.project_id
      WHERE p.owner_uid = auth.uid()
    )
  );

CREATE POLICY deliveries_via_project ON alert_deliveries
  FOR ALL
  USING (
    brief_id IN (
      SELECT ib.id
      FROM impact_briefs ib
      JOIN dependency_manifest dm ON dm.id = ib.dep_id
      JOIN projects p ON p.id = dm.project_id
      WHERE p.owner_uid = auth.uid()
    )
  );

-- ================================================================
-- STORED FUNCTION: claim_analysis_jobs
-- ================================================================
CREATE OR REPLACE FUNCTION claim_analysis_jobs(batch_size INT DEFAULT 3)
RETURNS SETOF analysis_jobs
LANGUAGE sql
AS $$
  UPDATE analysis_jobs
  SET
    status     = 'processing',
    started_at = now()
  WHERE id IN (
    SELECT id
    FROM   analysis_jobs
    WHERE  status = 'pending'
    ORDER  BY created_at
    LIMIT  batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
