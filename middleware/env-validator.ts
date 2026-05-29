import dotenv from 'dotenv';

dotenv.config();

export interface EnvVar {
  key: string;
  description: string;
  required: boolean;
  validator?: (val: string) => boolean;
  defaultValue?: string;
}

const REQUIRED_VARS: EnvVar[] = [
  { key: 'GEMINI_API_KEY', description: 'Google Gemini API key', required: false },
  { key: 'REDIS_URL', description: 'Redis connection string', required: false, defaultValue: 'redis://localhost:6379' },
  { key: 'SUPABASE_URL', description: 'Supabase project URL', required: false },
  { key: 'SUPABASE_SERVICE_KEY', description: 'Supabase service role key', required: false },
];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

export function validateEnv(): ValidationResult {
  const result: ValidationResult = { valid: true, missing: [], warnings: [] };

  for (const v of REQUIRED_VARS) {
    const val = process.env[v.key];
    if (!val && v.required && !v.defaultValue) {
      result.missing.push(`${v.key} — ${v.description}`);
      result.valid = false;
      continue;
    }
    const effectiveVal = val || v.defaultValue || '';
    if (v.validator && effectiveVal && !v.validator(effectiveVal)) {
      console.warn(`${v.key} fails format validation — may cause issues`);
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    result.warnings.push('GEMINI_API_KEY not set — Gemini analysis will fall back to local deterministic engine');
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    result.warnings.push('Supabase not configured — results will not be persisted to database');
  }

  return result;
}

export function assertValidEnv(): void {
  const result = validateEnv();
  if (!result.valid) {
    const messages = ['Environment validation failed:'];
    if (result.missing.length > 0) messages.push('  Missing:', ...result.missing.map(m => `    - ${m}`));
    console.error(messages.join('\n'));
    process.exit(1);
  }
  for (const w of result.warnings) console.warn('Warning:', w);
}
