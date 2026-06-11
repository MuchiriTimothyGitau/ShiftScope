export const PRESET_TEMPLATES = {
  safe: {
    name: "Safe Modern Microservice (Node)",
    description: "Permissive licenses, fully updated dependencies, and zero vulnerabilities.",
    format: "package.json",
    content: `{
  "name": "secure-gateway",
  "version": "2.4.0",
  "dependencies": {
    "express": "^4.21.2",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "lucide-react": "^0.395.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.11"
  }
}`
  },
  deprecated: {
    name: "Legacy Stack (Node deprecated)",
    description: "Contains critical security hazards, unmaintained libraries, and legacy patterns.",
    format: "package.json",
    content: `{
  "name": "enterprise-report-portal",
  "version": "1.0.2",
  "dependencies": {
    "express": "3.10.1",
    "moment": "^2.18.1",
    "request": "^2.88.2",
    "lodash": "^4.17.15"
  },
  "devDependencies": {
    "node-sass": "^4.14.1"
  }
}`
  },
  pypiVulnerable: {
    name: "Legacy Python Stack (PIP)",
    description: "Deprecated Python libraries containing serious denial-of-service and unpatched security bugs.",
    format: "requirements.txt",
    content: `# Enterprise python calculations bridge
requests==2.22.0
flask==1.1.2
urllib3==1.25.9
cryptography==3.2.1
jinja2>=2.11`
  },
  gplViral: {
    name: "Viral License Violation (Node)",
    description: "Uses a copyleft GPL-3.0 library that might trigger source-code release mandates.",
    format: "package.json",
    content: `{
  "name": "proprietary-fintech-engine",
  "version": "3.1.0",
  "dependencies": {
    "express": "^4.21.2",
    "gpl-compliance-lib": "^1.0.0"
  }
}`
  }
};
