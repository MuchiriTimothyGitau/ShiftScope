import { z } from 'zod';

export const SeverityEnum = z.enum(['critical', 'high', 'medium', 'low']);

export const BreakingChangeSchema = z.object({
  description: z.string().min(1),
  affected_pattern: z.string(),
  before_code: z.string(),
  after_code: z.string(),
  fix_description: z.string(),
  file_hint: z.string().nullable(),
  estimated_minutes: z.number().default(0),
});

export const PreCveSignalSchema = z.object({
  url: z.string(),
  title: z.string(),
  date: z.string(),
  credibility_score: z.number().min(0).max(1),
});

export const ImpactBriefSchema = z.object({
  dep_name: z.string(),
  old_version: z.string(),
  new_version: z.string(),
  severity: SeverityEnum,
  summary: z.string(),
  breaking_changes: z.array(BreakingChangeSchema).default([]),
  pre_cve_signals: z.array(PreCveSignalSchema).default([]),
  estimated_fix_minutes: z.number().default(0),
  safe_to_upgrade: z.boolean().default(true),
});

export const AlertDeliverySchema = z.object({
  id: z.string().uuid().optional(),
  brief_id: z.string().uuid(),
  channel: z.enum(['slack', 'email', 'webhook', 'dashboard']),
  status: z.enum(['sent', 'failed', 'suppressed']).optional(),
  delivered_at: z.string().datetime().optional(),
});

export type Severity = z.infer<typeof SeverityEnum>;
export type ImpactBrief = z.infer<typeof ImpactBriefSchema>;
