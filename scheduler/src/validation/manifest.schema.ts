import { z } from 'zod';

export const EcosystemEnum = z.enum(['npm', 'pypi', 'crates', 'go', 'gem', 'maven']);

export const DependencyRecordSchema = z.object({
  name: z.string().min(1),
  ecosystem: EcosystemEnum,
  pinned_version: z.string().nullable(),
  version_spec: z.string().default(''),
  is_direct: z.boolean().default(true),
  is_dev: z.boolean().default(false),
  resolved_url: z.string().optional(),
  integrity: z.string().optional(),
});

export const DependencyManifestSchema = z.object({
  id: z.string().uuid().optional(),
  project_id: z.string().uuid(),
  name: z.string().min(1),
  ecosystem: EcosystemEnum,
  pinned_version: z.string().min(1),
  version_spec: z.string().nullable().optional(),
  is_direct: z.boolean().default(true),
  is_dev: z.boolean().default(false),
  last_scanned_at: z.string().datetime().nullable().optional(),
});

export type DependencyRecord = z.infer<typeof DependencyRecordSchema>;
export type Ecosystem = z.infer<typeof EcosystemEnum>;
