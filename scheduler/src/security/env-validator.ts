// Validates all required env vars on startup — fails fast with clear message.

export interface EnvVar {
  key: string;
  description: string;
  required: boolean;
  validator?: (val: string) => boolean;
  defaultValue?: string;
}

const SHARED_VARS: EnvVar[] = [
  { key: 'SUPABASE_URL', description: 'Supabase project URL', required: true,
    validator: (v) => v.startsWith('https://') && v.includes('.supabase.co') },
  { key: 'SUPABASE_SERVICE_KEY', description: 'Supabase service role key', required: true,
    validator: (v) => v.length > 20 },
  { key: 'REDIS_URL', description: 'Redis connection string', required: true,
    defaultValue: 'redis://localhost:6379' },
];

const SCHEDULER_VARS: EnvVar[] = [
  { key: 'SCAN_INTERVAL_MINUTES', description: 'How often to scan for updates', required: false, defaultValue: '15' },
  { key: 'REGISTRY_CHECK_TIMEOUT_MS', description: 'Timeout per registry API call', required: false, defaultValue: '5000' },
];

const ANALYSIS_VARS: EnvVar[] = [
  { key: 'GEMINI_API_KEY', description: 'Google Gemini API key for AI chain', required: true,
    validator: (v) => v.startsWith('AI') || v.length > 10 },
];

const DELIVERY_VARS: EnvVar[] = [
  { key: 'SLACK_BOT_TOKEN', description: 'Slack bot token', required: false },
  { key: 'RESEND_API_KEY', description: 'Resend API key for email', required: false },
  { key: 'WEBHOOK_SECRET', description: 'Secret for HMAC-signing webhooks', required: false },
];

export interface ValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

export function validateEnv(module: 'scheduler' | 'analysis' | 'delivery'): ValidationResult {
  const result: ValidationResult = { valid: true, missing: [], invalid: [], warnings: [] };
  const allVars = [...SHARED_VARS];

  if (module === 'scheduler') allVars.push(...SCHEDULER_VARS);
  if (module === 'analysis') allVars.push(...ANALYSIS_VARS);
  if (module === 'delivery') allVars.push(...DELIVERY_VARS);

  for (const v of allVars) {
    const val = process.env[v.key];
    if (!val && v.required && !v.defaultValue) {
      result.missing.push(`${v.key} — ${v.description}`);
      result.valid = false;
      continue;
    }
    const effectiveVal = val || v.defaultValue || '';
    if (v.validator && effectiveVal && !v.validator(effectiveVal)) {
      result.invalid.push(`${v.key} — expected valid format (${v.description})`);
      result.valid = false;
    }
  }

  if (process.env.NODE_ENV === 'development') {
    result.warnings.push('Running in development mode — ensure production env vars are set for deployment');
  }

  return result;
}

export function assertValidEnv(module: 'scheduler' | 'analysis' | 'delivery'): void {
  const result = validateEnv(module);
  if (!result.valid) {
    const messages: string[] = ['Environment validation failed:'];
    if (result.missing.length > 0) messages.push('  Missing:', ...result.missing.map(m => `    - ${m}`));
    if (result.invalid.length > 0) messages.push('  Invalid:', ...result.invalid.map(m => `    - ${m}`));
    messages.push('', 'Set these in your .env file or environment before starting.');
    console.error(messages.join('\n'));
    process.exit(1);
  }
  if (result.warnings.length > 0) {
    for (const w of result.warnings) console.warn('Warning:', w);
  }
}

export function getConfig(module: 'scheduler' | 'analysis' | 'delivery'): Record<string, string> {
  const allVars = [...SHARED_VARS];
  if (module === 'scheduler') allVars.push(...SCHEDULER_VARS);
  if (module === 'analysis') allVars.push(...ANALYSIS_VARS);
  if (module === 'delivery') allVars.push(...DELIVERY_VARS);

  const config: Record<string, string> = {};
  for (const v of allVars) {
    config[v.key] = process.env[v.key] || v.defaultValue || '';
  }
  return config;
}
