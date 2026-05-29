import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface SecurityScanResult {
  malware_indicators: MalwareIndicator[];
  code_analysis: CodeAnalysis;
  dependency_risk: DependencyRisk;
  overall_assessment: string;
  confidence: number;
}

interface MalwareIndicator {
  type: string;
  description: string;
  confidence: number;
  evidence: string[];
}

interface CodeAnalysis {
  suspicious_patterns: string[];
  obfuscation_detected: boolean;
  network_activity: boolean;
  file_system_access: boolean;
  crypto_usage: boolean;
  installer_behavior: boolean;
}

interface DependencyRisk {
  typo_squatting: boolean;
  dependency_confusion: boolean;
  malicious_dependency_chain: boolean;
  known_vulnerability: boolean;
}

export async function securityScan(
  depName: string,
  ecosystem: string,
  changelogText: string,
  communitySnippets: string,
  issuesText: string,
  cveSignals: any[],
): Promise<SecurityScanResult> {
  const prompt = `You are a security analyst specializing in open-source supply chain attacks.

Analyze this package for malware and supply chain risk indicators:

Package: ${depName}
Ecosystem: ${ecosystem}

Changelog / Release Notes:
${changelogText || 'Not available'}

Community Discussion (Reddit, HN, etc.):
${communitySnippets || 'Not available'}

GitHub Issues:
${issuesText || 'Not available'}

CVE / Vulnerability Signals:
${JSON.stringify(cveSignals || [], null, 2)}

Respond with a JSON object exactly matching this interface:
{
  "malware_indicators": [
    {
      "type": "suspicious_script|remote_download|data_exfil|obfuscation|typo_squatting|dependency_confusion|known_malware|other",
      "description": "Clear description of the indicator",
      "confidence": 0.0-1.0,
      "evidence": ["specific evidence strings from the data above"]
    }
  ],
  "code_analysis": {
    "suspicious_patterns": ["list of suspicious patterns found in code mentions"],
    "obfuscation_detected": true/false,
    "network_activity": true/false,
    "file_system_access": true/false,
    "crypto_usage": true/false,
    "installer_behavior": true/false
  },
  "dependency_risk": {
    "typo_squatting": true/false,
    "dependency_confusion": true/false,
    "malicious_dependency_chain": true/false,
    "known_vulnerability": true/false
  },
  "overall_assessment": "One sentence summary of the security posture",
  "confidence": 0.0-1.0
}

Focus on real indicators. If no evidence of malware exists, set confidence near 0 and note "No indicators found".`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleaned = text.replace(/```(?:json)?\s*/gi, '').trim();
    const parsed: SecurityScanResult = JSON.parse(cleaned);

    return parsed;
  } catch (err) {
    console.error(`Security scan failed for ${depName}:`, err);
    return {
      malware_indicators: [],
      code_analysis: {
        suspicious_patterns: [],
        obfuscation_detected: false,
        network_activity: false,
        file_system_access: false,
        crypto_usage: false,
        installer_behavior: false,
      },
      dependency_risk: {
        typo_squatting: false,
        dependency_confusion: false,
        malicious_dependency_chain: false,
        known_vulnerability: cveSignals && cveSignals.length > 0,
      },
      overall_assessment: 'Security scan failed — manual review recommended',
      confidence: 0,
    };
  }
}
