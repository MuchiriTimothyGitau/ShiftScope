import { checkTyposquat, TyposquatResult } from './typosquat-detector';

type Ecosystem = 'npm' | 'pypi' | 'crates' | 'go' | 'gem' | 'maven';

export interface RiskAssessment {
  dep_name: string;
  ecosystem: Ecosystem;
  overall_risk_score: number;
  risk_level: 'none' | 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  typosquat: TyposquatResult | null;
  malware_indicators: MalwareIndicator[];
  supply_chain_indicators: SupplyChainIndicator[];
}

export interface RiskSignal {
  category: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  score: number;
}

export interface MalwareIndicator {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
}

export interface SupplyChainIndicator {
  type: string;
  description: string;
  risk: 'low' | 'medium' | 'high';
}

const KNOWN_MALICIOUS_PATTERNS: { pattern: RegExp; type: string; description: string }[] = [
  { pattern: /(?:postinstall|preinstall|prepare|install)\s*:\s*.+/, type: 'suspicious_script', description: 'Package runs install scripts that could execute arbitrary code' },
  { pattern: /curl\s+.*\||wget\s+.*\||powershell\s+.*-/, type: 'remote_download', description: 'Install script downloads and executes remote content' },
  { pattern: /eval\(|exec\(|spawn\(|child_process/, type: 'code_execution', description: 'Package executes system commands at runtime' },
  { pattern: /(?:env|process\.env)\s*\[?\s*['"`]/, type: 'env_exfiltration', description: 'Package accesses environment variables (potential credential theft)' },
  { pattern: /require\s*\(\s*['"`][^'"]*['"`]\s*\)\s*\.[\s\S]{0,50}(?:request|fetch|get|post)/, type: 'data_exfil', description: 'Package reads local files and sends them externally' },
  { pattern: /(?:fs\.writeFileSync|writeFile|appendFile)\s*\(/, type: 'file_write', description: 'Package writes files outside expected directories' },
  { pattern: /crypto\.(?:createDecipher|createHash|randomBytes).{0,100}(?:request|https|http)/, type: 'crypto_exfil', description: 'Package uses encryption then sends data (potential data theft)' },
  { pattern: /(?:telemetry|analytics|tracking|beacon|pingback)/i, type: 'phone_home', description: 'Package may beacon to external servers' },
];

const ABANDONED_ECOSYSTEMS: Partial<Record<Ecosystem, string[]>> = {
  npm: ['gulp', 'bower', 'grunt', 'jade', 'coffeescript', 'meteor'],
  pypi: ['pycrypto', 'distutils', 'pyramid'],
  gem: ['sprockets', 'passenger'],
};

interface RegistryMetadata {
  name: string;
  latestVersion: string;
  weeklyDownloads?: number;
  lastPublishDate?: string;
  deprecated?: boolean;
  hasScripts?: boolean;
  scripts?: Record<string, string>;
  repository?: string;
  homepage?: string;
  author?: string;
}

export function assessRisk(
  depName: string,
  ecosystem: Ecosystem,
  metadata: Partial<RegistryMetadata>,
  pinnedVersion: string,
): RiskAssessment {
  const signals: RiskSignal[] = [];
  const malwareIndicators: MalwareIndicator[] = [];
  const supplyChain: SupplyChainIndicator[] = [];
  let score = 0;

  const typosquat = checkTyposquat(depName, ecosystem);
  if (typosquat.is_suspicious) {
    signals.push({
      category: 'typosquatting',
      description: `Package name "${depName}" resembles popular package "${typosquat.lookalike_of}"`,
      severity: typosquat.risk_score >= 5 ? 'high' : 'medium',
      score: typosquat.risk_score,
    });
    score += typosquat.risk_score * 1.5;
  }

  if (metadata.deprecated) {
    signals.push({
      category: 'deprecated',
      description: `Package "${depName}" is marked as deprecated`,
      severity: 'medium',
      score: 5,
    });
    score += 5;
  }

  if (metadata.weeklyDownloads !== undefined && metadata.weeklyDownloads < 1000) {
    signals.push({
      category: 'low_adoption',
      description: `Very low weekly downloads (${metadata.weeklyDownloads}) — high risk of abandonment or malicious intent`,
      severity: 'low',
      score: 2,
    });
    score += 2;
  }

  if (metadata.hasScripts && metadata.scripts) {
    for (const [hook, script] of Object.entries(metadata.scripts)) {
      if (['preinstall', 'install', 'postinstall', 'preuninstall'].includes(hook)) {
        for (const pattern of KNOWN_MALICIOUS_PATTERNS) {
          if (pattern.pattern.test(script)) {
            malwareIndicators.push({
              type: pattern.type,
              description: `${pattern.description} (in ${hook} script)`,
              confidence: 0.7,
              evidence: [script],
            });
            score += 3;
          }
        }
      }
    }
  }

  const abandoned = ABANDONED_ECOSYSTEMS[ecosystem];
  if (abandoned?.some(a => depName.toLowerCase().includes(a))) {
    supplyChain.push({
      type: 'abandoned_ecosystem',
      description: `Package relates to deprecated/abandoned ecosystem tool "${abandoned.find(a => depName.toLowerCase().includes(a))}"`,
      risk: 'medium',
    });
    score += 2;
  }

  if (metadata.lastPublishDate) {
    const lastPub = new Date(metadata.lastPublishDate);
    const yearsSinceUpdate = (Date.now() - lastPub.getTime()) / (365 * 24 * 60 * 60 * 1000);
    if (yearsSinceUpdate > 2) {
      signals.push({
        category: 'unmaintained',
        description: `No updates in ${Math.floor(yearsSinceUpdate)} years — security patches unlikely`,
        severity: yearsSinceUpdate > 3 ? 'high' : 'medium',
        score: Math.min(yearsSinceUpdate, 5),
      });
      score += Math.min(yearsSinceUpdate, 5);
    }
  }

  if (!metadata.repository && !metadata.homepage) {
    supplyChain.push({
      type: 'no_source',
      description: 'No repository URL or homepage — provenance cannot be verified',
      risk: 'high',
    });
    score += 3;
  }

  if (metadata.author === undefined || metadata.author === 'Unknown' || metadata.author === '') {
    supplyChain.push({
      type: 'anonymous_author',
      description: 'Package author is unknown — no reputation to verify',
      risk: 'medium',
    });
    score += 1;
  }

  let riskLevel: RiskAssessment['risk_level'] = 'none';
  if (score >= 15) riskLevel = 'critical';
  else if (score >= 10) riskLevel = 'high';
  else if (score >= 5) riskLevel = 'medium';
  else if (score >= 2) riskLevel = 'low';

  return {
    dep_name: depName,
    ecosystem,
    overall_risk_score: Math.min(Math.round(score * 10) / 10, 10),
    risk_level: riskLevel,
    signals,
    typosquat,
    malware_indicators: malwareIndicators,
    supply_chain_indicators: supplyChain,
  };
}
