// Typosquatting detection for dependency names across ecosystems.
// Uses known-popular packages as reference to flag lookalike names.

type Ecosystem = 'npm' | 'pypi' | 'crates' | 'go' | 'gem' | 'maven';

const POPULAR_PACKAGES: Record<Ecosystem, string[]> = {
  npm: [
    'react', 'lodash', 'axios', 'express', 'chalk', 'moment', 'uuid',
    'typescript', 'webpack', 'babel', 'eslint', 'prettier', 'nodemon',
    'body-parser', 'cors', 'dotenv', 'jsonwebtoken', 'mongoose',
    'next', 'nuxt', 'vue', 'angular', 'svelte', 'gatsby', 'jest',
    'mocha', 'cypress', 'tailwindcss', 'sass', 'postcss',
    'date-fns', 'dayjs', 'rxjs', 'immer', 'zustand', 'recoil',
    'prisma', 'typeorm', 'drizzle-orm', 'graphql', 'apollo',
    'passport', 'bcrypt', 'helmet', 'socket.io', 'ws',
    'sharp', 'multer', 'nodemailer', 'cheerio', 'puppeteer',
  ],
  pypi: [
    'requests', 'numpy', 'pandas', 'flask', 'django', 'fastapi',
    'pydantic', 'sqlalchemy', 'scipy', 'scikit-learn', 'torch',
    'tensorflow', 'pillow', 'matplotlib', 'beautifulsoup4',
    'boto3', 'celery', 'redis', 'psycopg2', 'alembic',
    'pytest', 'black', 'flake8', 'mypy', 'ruff', 'poetry',
    'click', 'typer', 'httpx', 'aiohttp', 'uvicorn', 'gunicorn',
    'jupyter', 'ipython', 'sphinx', 'cryptography', 'pydantic-core',
  ],
  crates: [
    'serde', 'tokio', 'regex', 'clap', 'rayon', 'thiserror',
    'anyhow', 'rand', 'reqwest', 'actix', 'axum', 'warp',
    'rocket', 'tide', 'diesel', 'sqlx', 'rusqlite',
    'lazy_static', 'once_cell', 'log', 'env_logger', 'tracing',
    'nom', 'pest', 'syn', 'quote', 'proc-macro2',
  ],
  go: [
    'gorilla/mux', 'gin-gonic/gin', 'gorm', 'cobra', 'viper',
    'zap', 'logrus', 'fiber', 'echo', 'chi', 'negroni',
    'golang-jwt', 'pgx', 'redis', 'validator', 'testify',
  ],
  gem: [
    'rails', 'devise', 'rspec', 'puma', 'sidekiq', 'pg',
    'rack', 'sinatra', 'hanami', 'grape', 'dry-types',
    'activeadmin', 'cancancan', 'pundit', 'kaminari',
    'paperclip', 'carrierwave', 'friendly_id', 'searchkick',
    'httparty', 'faraday', 'rest-client', 'nokogiri', 'sassc',
  ],
  maven: [
    'junit', 'log4j', 'slf4j', 'jackson', 'hibernate', 'spring',
    'spring-boot', 'lombok', 'guava', 'apache-commons',
    'mockito', 'assertj', 'testng', 'selenium', 'cucumber',
    'mysql-connector', 'postgresql', 'flyway', 'liquibase',
    'netty', 'reactor', 'rxjava', 'vertx', 'kafka-clients',
  ],
};

function levenshteinDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function subdomainSwap(name: string): string[] {
  const parts = name.split('/');
  if (parts.length < 2) return [];
  return [parts.reverse().join('/')];
}

function charRepetitionScore(name: string): number {
  const reps = name.match(/(.)\1{2,}/g);
  return reps ? reps.reduce((s, r) => s + (r.length - 2) * 0.3, 0) : 0;
}

function homoglyphScore(name: string): number {
  const homoglyphs: Record<string, string> = {
    '0': 'o', '1': 'l', '3': 'e', '4': 'a', '5': 's', '6': 'g',
    '7': 't', '8': 'b', '9': 'g', '@': 'a', '$': 's', '#': 'h',
  };
  let score = 0;
  for (const char of name) {
    if (homoglyphs[char]) score += 1;
  }
  return score;
}

export interface TyposquatResult {
  is_suspicious: boolean;
  lookalike_of: string | null;
  similarity: number;
  signals: string[];
  risk_score: number;
}

export function checkTyposquat(name: string, ecosystem: Ecosystem): TyposquatResult {
  const signals: string[] = [];
  const lower = name.toLowerCase();

  const popular = POPULAR_PACKAGES[ecosystem] || [];
  let bestMatch: { pkg: string; dist: number } | null = null;

  for (const popularPkg of popular) {
    const dist = levenshteinDistance(lower, popularPkg.toLowerCase());
    if (dist > 0 && dist <= 3 && dist / Math.max(lower.length, popularPkg.length) <= 0.4) {
      if (!bestMatch || dist < bestMatch.dist) {
        bestMatch = { pkg: popularPkg, dist };
      }
    }
  }

  if (bestMatch) {
    signals.push(`Typosquat: differs from "${bestMatch.pkg}" by ${bestMatch.dist} character(s)`);
  }

  const repscore = charRepetitionScore(lower);
  if (repscore > 0.5) {
    signals.push(`Unusual character repetition (score: ${repscore.toFixed(1)})`);
  }

  const homoscore = homoglyphScore(lower);
  if (homoscore > 0) {
    signals.push(`Contains ${homoscore} homoglyph character(s) that mimic letters (e.g. '0'→'o')`);
  }

  const suspiciousPatterns = [
    { pattern: /[_-]{2,}/, desc: 'Multiple consecutive underscores/hyphens' },
    { pattern: /^[^a-zA-Z]/, desc: 'Name starts with non-letter character' },
    { pattern: /[^a-zA-Z0-9_.\-\/]/, desc: 'Contains special characters outside allowed set' },
    { pattern: /^[a-zA-Z]$/, desc: 'Single-character name' },
    { pattern: /^(a|an|the|this|that|my|new|test|demo|temp|asdf|qwerty)/, desc: 'Generic/suspicious prefix' },
  ];

  for (const { pattern, desc } of suspiciousPatterns) {
    if (pattern.test(lower)) signals.push(desc);
  }

  let riskScore = 0;
  if (bestMatch) riskScore += Math.max(0, 1 - bestMatch.dist / 5) * 4;
  riskScore += Math.min(repscore, 2);
  riskScore += Math.min(homoscore, 2);
  riskScore += Math.min(signals.length * 0.5, 3);

  return {
    is_suspicious: riskScore >= 2 || (bestMatch !== null && bestMatch.dist <= 2),
    lookalike_of: bestMatch?.pkg || null,
    similarity: bestMatch ? 1 - bestMatch.dist / Math.max(lower.length, bestMatch.pkg.length) : 0,
    signals,
    risk_score: Math.min(Math.round(riskScore * 10) / 10, 10),
  };
}
