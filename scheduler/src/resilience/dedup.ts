// Deduplication utilities to prevent duplicate scrapes and impact briefs.

import { createHash } from 'crypto';

export function scrapeContentHash(depId: string, sourceType: string, sourceUrl: string | null, version: string): string {
  const raw = `${depId}|${sourceType}|${sourceUrl || 'no-url'}|${version}`;
  return createHash('sha256').update(raw).digest('hex');
}

export function briefContentHash(depId: string, oldVersion: string, newVersion: string): string {
  const raw = `${depId}|${oldVersion}|${newVersion}`;
  return createHash('sha256').update(raw).digest('hex');
}

export function registryCacheKey(ecosystem: string, name: string): string {
  return `shiftscope:registry:${ecosystem.toLowerCase()}:${name.toLowerCase()}`;
}

export function isSignificantUpgrade(oldVer: string, newVer: string): boolean {
  const oldParts = oldVer.split('.').map(Number);
  const newParts = newVer.split('.').map(Number);

  if (oldParts.length < 2 || newParts.length < 2) return true;

  const oldMajor = oldParts[0] || 0;
  const newMajor = newParts[0] || 0;

  if (newMajor > oldMajor) return true;

  if (newMajor === oldMajor) {
    const oldMinor = oldParts[1] || 0;
    const newMinor = newParts[1] || 0;
    if (newMinor > oldMinor) return true;
  }

  return false;
}

export function throttleIdenticalScrapes(
  recentScrapes: Array<{ source_type: string; new_version: string; scraped_at: string }>,
  cooldownMinutes: number = 30,
): boolean {
  if (recentScrapes.length === 0) return false;

  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;

  return recentScrapes.some(s => {
    const scrapedAt = new Date(s.scraped_at).getTime();
    return (now - scrapedAt) < cooldownMs;
  });
}
