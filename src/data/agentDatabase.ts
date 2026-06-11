export const AGENT_INTELLIGENCE_DATABASE: Record<string, any> = {
  "express": {
    package: "express",
    ecosystem: "npm",
    version: "3.10.1",
    cve: "CVE-2024-43799",
    severity: "Critical",
    score: 94,
    summary: "Express 3.x is highly deprecated and has substantial unpatched vulnerabilities. Upgrading to Express 4.21.2 or 5.x is recommended immediately.",
    steps: [
      {
        name: "Step 1: Summarize Release Notes",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Express 3.10.1 is an obsolete branch. Current release branches (Express 4.21.2 and Express 5) fix multiple remote protocol and routing engines."
      },
      {
        name: "Step 2: Extract Breaking Changes & CVEs",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Logged critical security warnings:\n- CVE-2024-43799: Prototype Pollution in Express router config parser.\n- CVE-2023-26159: Open redirect hazard through malformed hostname processing.\n- 14 breaking API changes between Express v3.x and v4.x."
      },
      {
        name: "Step 3: Cross-Reference Codebase Usage",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Codebase uses 'express.Router()' in 'server.ts', which instantiates the vulnerable prototype inheritance parsing system. Usage is DIRECT and VULNERABLE."
      },
      {
        name: "Step 4: Generate Operational Remediation",
        model: "Gemini 1.5 Pro",
        status: "success",
        isDiff: true,
        beforeCode: `// package.json (Vulnerable node configuration)\n"dependencies": {\n  "express": "3.10.1"\n}`,
        afterCode: `// package.json (Remediated node configuration)\n"dependencies": {\n  "express": "^4.21.2"\n}`,
        affectedFile: "package.json",
        explanation: "Upgrade Express to v4.21.2 which includes security routing overrides and eliminates prototype parsing exploits."
      },
      {
        name: "Step 5: Score Security Severity",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Risk score: 94/100. Severity: CRITICAL. Est. migration time: 15 minutes. Safe to upgrade: Yes (fully verified offline fallback components)."
      }
    ],
    cognee: {
      nodes: [
        { id: "e1", label: "Package", name: "express v3.10.1" },
        { id: "e2", label: "Vulnerability", name: "CVE-2024-43799 Prototype Pollution" },
        { id: "e3", label: "License", name: "MIT Permissive" },
        { id: "e4", label: "Policy", name: "Advisory Node Policy v3" },
        { id: "e5", label: "Action", name: "Upgrade to ^4.21.2" }
      ],
      edges: [
        { source: "e1", target: "e2", relation: "EXPOSES" },
        { source: "e1", target: "e3", relation: "LICENSED_UNDER" },
        { source: "e4", target: "e1", relation: "EVALUATES" },
        { source: "e5", target: "e2", relation: "REMEDIATES" }
      ],
      memoryReport: "Cognee Knowledge Graph mapped 5 entity relationship coordinates.\nPersistent semantic graph link registered 'express' to 'Upgrade to ^4.21.2' to bypass redundant cold scans in subsequent commits.\nVector similarities matched this structure with previous Express.js deprecation memory models."
    },
    triggerware: {
      correlationScore: 94,
      actions: [
        {
          name: "Automatic Pull Request Remediation",
          details: "Inject updated package config nodes into project branch",
          output: "Successfully pushed git branch 'shiftscope/upgrade-express-4'\nGenerated PR #1: Upgrade Express to ^4.21.2 to bypass CVE-2024-43799."
        },
        {
          name: "Slack Security Notification Dispatch",
          details: "Relay rich blocks containing mitigation code to #devops-alerts",
          output: "HTTP 200 Sent payload to Slack endpoint containing before/after diff panels."
        }
      ]
    },
    brightdata: {
      target: "npm/express/3.10.1",
      routed: 18,
      pool: "Bright Data Web Unlocker Proxy Core",
      bytes: 184560,
      scraped: "Scraped 'registry.npmjs.org/express'\nPlucked 14 GitHub issue threads labeled 'breaking' and 'prototype-pollution'\nSuccessfully isolated CVE descriptors and extracted patches from the security researcher's commit history."
    },
    logs: [
      "[Bright Data] Initializing Residential IP socket bypass loop...",
      "[Bright Data] Successfully routed through peer gateway in London, UK.",
      "[Bright Data] Scraped npm registry and isolated version history for 'express'.",
      "[Cognee Ingest] Mapping metadata into entities list...",
      "[Cognee Graph] Structured 5 nodes and 4 directional knowledge graph links.",
      "[Cognee Graph] Persistent memory coordinates saved to relational Supabase tier.",
      "[AI Chain] Simulating Gemini 5-Step prompt sequence...",
      "[AI Chain] Step 1 Summarize release notes... Success.",
      "[AI Chain] Step 2 Log vulnerabilities and breaking indices... CVE-2024-43799 extracted.",
      "[AI Chain] Step 4 Generate code remediation patch... Complete.",
      "[TriggerWare Action] Security criteria matched! Executing automation suite...",
      "[TriggerWare Webhook] Pushed pull request details & dispatched Slack alerts."
    ]
  },
  "request": {
    package: "request",
    ecosystem: "npm",
    version: "2.88.2",
    cve: "CVE-2023-28155",
    severity: "High",
    score: 88,
    summary: "The request library was fully deprecated in 2020. Severe security hazards exist in its core nested HTTP parsing and redirects.",
    steps: [
      {
        name: "Step 1: Summarize Release Notes",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "The legacy 'request' project is unmaintained and officially frozen."
      },
      {
        name: "Step 2: Extract Breaking Changes & CVEs",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Logged critical warnings:\n- CVE-2023-28155: Request header exposure during cross-domain redirects."
      },
      {
        name: "Step 3: Cross-Reference Codebase Usage",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Codebase invokes 'request()' on line 12 of 'src/api/reports.ts'. Usage is ACTIVE and highly vulnerable."
      },
      {
        name: "Step 4: Generate Operational Remediation",
        model: "Gemini 1.5 Pro",
        status: "success",
        isDiff: true,
        beforeCode: "// src/api/reports.ts\nimport request from 'request';\n\nrequest('https://api.corporate-analytics.com/data', (err, res, body) => {\n  if (!err) console.log(JSON.parse(body));\n});",
        afterCode: "// src/api/reports.ts\nimport axios from 'axios';\n\naxios.get('https://api.corporate-analytics.com/data')\n  .then(res => { console.log(res.data); })\n  .catch(err => console.error(err));",
        affectedFile: "src/api/reports.ts",
        explanation: "Replace unmaintained 'request' package imports with 'axios' for modern, memory-safe request execution."
      },
      {
        name: "Step 5: Score Security Severity",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Risk score: 88/100. Severity: HIGH. Est. migration time: 30 minutes."
      }
    ],
    cognee: {
      nodes: [
        { id: "r1", label: "Package", name: "request v2.88.2" },
        { id: "r2", label: "Vulnerability", name: "CVE-2023-28155 Redirect Leak" },
        { id: "r3", label: "License", name: "Apache-2.0" },
        { id: "r4", label: "Action", name: "Migrate to Axios" }
      ],
      edges: [
        { source: "r1", target: "r2", relation: "EXPOSES" },
        { source: "r4", target: "r2", relation: "ELIMINATES" }
      ],
      memoryReport: "Mapped 4 graph coordinates inside Cognee memory.\nVector representations indicate 'request' matches 92% of legacy unmaintained pattern templates."
    },
    triggerware: {
      correlationScore: 88,
      actions: [{
        name: "Code Refactoring Generator",
        details: "Construct modern request wrapper module replacement",
        output: "Refactor completed. Replaced 'request' instances in /src/api/reports.ts with axios.get."
      }]
    },
    brightdata: {
      target: "npm/request",
      routed: 11,
      pool: "Bright Data Web Unlocker Peer Mesh",
      bytes: 94800,
      scraped: "Pulled request deprecation manifesto written by original author\nIsolated 4 CVE reports linked to unmaintained stream utilities."
    },
    logs: [
      "[Bright Data] Resolving proxy routing pools...",
      "[Bright Data] Scraped GitHub issue board and author notes.",
      "[Cognee Ingest] Forming cognitive links to historical node templates...",
      "[AI Chain] Step 2 Extracting CVE vulnerability records: CVE-2023-28155 active.",
      "[AI Chain] Step 4 Formulating precise axios refactoring block...",
      "[TriggerWare Action] Code rewrite completed cleanly."
    ]
  },
  "moment": {
    package: "moment",
    ecosystem: "npm",
    version: "2.18.1",
    cve: "None (Deprecation / Bloat)",
    severity: "Medium",
    score: 65,
    summary: "Moment.js is no longer under active development. It carries massive bundle weight ~235KB.",
    steps: [
      {
        name: "Step 1: Summarize Release Notes",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Moment.js dates carry immutable parsing structures but heavy bundle performance impact."
      },
      {
        name: "Step 2: Extract Architectural Bloat",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Excessive bundle size: 235KB uncompressed."
      },
      {
        name: "Step 3: Cross-Reference Codebase Usage",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Located imports inside 'src/components/DateDisplay.tsx'."
      },
      {
        name: "Step 4: Generate Operational Remediation",
        model: "Gemini 1.5 Pro",
        status: "success",
        isDiff: true,
        beforeCode: "import moment from 'moment';\nexport const DateDisplay = ({ ts }) => <div>{moment(ts).format('MMMM Do YYYY, h:mm:ss a')}</div>;",
        afterCode: "import dayjs from 'dayjs';\nexport const DateDisplay = ({ ts }) => <div>{dayjs(ts).format('MMMM D YYYY, h:mm:ss a')}</div>;",
        affectedFile: "src/components/DateDisplay.tsx",
        explanation: "Swap 'moment' with 'dayjs' (identical API, 98% smaller bundle)."
      },
      {
        name: "Step 5: Score Security Severity",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Risk score: 65/100 (Performance Risk). Severity: MEDIUM."
      }
    ],
    cognee: {
      nodes: [
        { id: "m1", label: "Package", name: "moment" },
        { id: "m2", label: "Policy", name: "Bundle Size Limit Guideline (Max 100KB)" },
        { id: "m3", label: "Action", name: "Swap for Day.js" }
      ],
      edges: [
        { source: "m1", target: "m2", relation: "VIOLATES" },
        { source: "m3", target: "m1", relation: "REPLACES" }
      ],
      memoryReport: "Registered custom bundle limitation policy violations.\nCognee persistent graph remembers Dayjs as the preferred substitute."
    },
    triggerware: {
      correlationScore: 65,
      actions: [{
        name: "Bundle Optimization Workflow",
        details: "Trigger bundle analyzer tracking parameters",
        output: "Performance analysis: Upgrading package will decrease SPA main chunk from 350KB to 117KB."
      }]
    },
    brightdata: {
      target: "npm/moment",
      routed: 8,
      pool: "Bright Data Web Unlocker Core",
      bytes: 65300,
      scraped: "Parsed moment.js maintainer blog explaining the freeze\nScraped recommended bundle alternatives statistics."
    },
    logs: [
      "[Bright Data] Fetching Moment.js npm statistics...",
      "[Cognee Ingest] Processing bundle size policy parameters...",
      "[AI Chain] Formulating Dayjs substitution template... Complete.",
      "[TriggerWare Action] Optimized bundle check queued successfully."
    ]
  },
  "lodash": {
    package: "lodash",
    ecosystem: "npm",
    version: "4.17.15",
    cve: "CVE-2020-8203",
    severity: "High",
    score: 82,
    summary: "Lodash v4.17.15 contains CVE-2020-8203 (Severe Prototype Pollution inside defaultsDeep merges).",
    steps: [
      {
        name: "Step 1: Summarize Release Notes",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Lodash releases above 4.17.21 address critical object injection and prototype pollution."
      },
      {
        name: "Step 2: Extract Breaking Changes & CVEs",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "- CVE-2020-8203: Prototype pollution payload inside defaultsDeep utility function."
      },
      {
        name: "Step 3: Cross-Reference Codebase Usage",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Located '_.defaultsDeep' inside user utility: 'src/utils/config.ts' line 45."
      },
      {
        name: "Step 4: Generate Operational Remediation",
        model: "Gemini 1.5 Pro",
        status: "success",
        isDiff: true,
        beforeCode: "import _ from 'lodash';\nexport function mergeConfigs(user, base) {\n  return _.defaultsDeep({}, user, base);\n}",
        afterCode: "import defaultsDeep from 'lodash/defaultsDeep.js';\nexport function mergeConfigs(user, base) {\n  return defaultsDeep({}, user, base);\n}",
        affectedFile: "src/utils/config.ts",
        explanation: "Upgrade lodash to v4.17.21. Use selective ESM file imports to reduce bundler penalty."
      },
      {
        name: "Step 5: Score Security Severity",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Risk score: 82/100. Severity: HIGH."
      }
    ],
    cognee: {
      nodes: [
        { id: "l1", label: "Package", name: "lodash v4.17.15" },
        { id: "l2", label: "Vulnerability", name: "CVE-2020-8203 DefaultsDeep Exploit" },
        { id: "l3", label: "Action", name: "Upgrade to v4.17.21" }
      ],
      edges: [
        { source: "l1", target: "l2", relation: "EXPOSES" },
        { source: "l3", target: "l2", relation: "PATCHES" }
      ],
      memoryReport: "Graph mapped. Memorized lodash prototype vulnerabilities pattern for future project code audits."
    },
    triggerware: {
      correlationScore: 82,
      actions: [{
        name: "Security Pull Request Trigger",
        details: "Initiate npm lodash version bump",
        output: "PR generated: Bump lodash definition from 4.17.15 to 4.17.21 in package.json."
      }]
    },
    brightdata: {
      target: "npm/lodash",
      routed: 14,
      pool: "Bright Data Web Unlocker Core",
      bytes: 141900,
      scraped: "Extracted details for CVSS score v3 7.5 vector pollution\nScraped patches from Lodash release notes branch."
    },
    logs: [
      "[Bright Data] Querying Lodash Github security advisories...",
      "[Cognee Ingest] Indexing CVE-2020-8203 vulnerability criteria...",
      "[AI Chain] Step 4 Generating targeted selective ESM migration files...",
      "[TriggerWare Action] Security webhook alert sent to engineering slack."
    ]
  },
  "flask": {
    package: "flask",
    ecosystem: "pypi",
    version: "1.1.2",
    cve: "CVE-2023-30861",
    severity: "Critical",
    score: 91,
    summary: "Flask v1.1.2 has reached End-Of-Life (EOL). It is vulnerable to severe security hazards.",
    steps: [
      {
        name: "Step 1: Summarize Release Notes",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Flask 1.x is unmaintained. Flask v3.0.0 addresses serious session signature bypass."
      },
      {
        name: "Step 2: Extract Breaking Changes & CVEs",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "- CVE-2023-30861: Session cookie hijacking.\n- WSGI deprecations."
      },
      {
        name: "Step 3: Cross-Reference Codebase Usage",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Codebase uses Flask WSGI app routing in 'app.py'."
      },
      {
        name: "Step 4: Generate Operational Remediation",
        model: "Gemini 1.5 Pro",
        status: "success",
        isDiff: true,
        beforeCode: "# requirements.txt\nflask==1.1.2\njinja2>=2.11",
        afterCode: "# requirements.txt\nflask>=3.0.2\njinja2>=3.1.3\nwerkzeug>=3.0.1",
        affectedFile: "requirements.txt",
        explanation: "Upgrade Flask to v3 or higher. Ensure Jinja2 and Werkzeug are updated together."
      },
      {
        name: "Step 5: Score Security Severity",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Risk score: 91/100. Severity: CRITICAL."
      }
    ],
    cognee: {
      nodes: [
        { id: "f1", label: "Package", name: "Flask v1.1.2" },
        { id: "f2", label: "Vulnerability", name: "CVE-2023-30861 Token Hijack" },
        { id: "f3", label: "Policy", name: "Python EOL Compliance Guideline" },
        { id: "f4", label: "Action", name: "Upgrade to Flask >=3.0" }
      ],
      edges: [
        { source: "f1", target: "f2", relation: "EXPOSES" },
        { source: "f3", target: "f1", relation: "OUTLAWS" },
        { source: "f4", target: "f2", relation: "MITIGATES" }
      ],
      memoryReport: "Python environment graph parsed with 4 active nodes."
    },
    triggerware: {
      correlationScore: 91,
      actions: [{
        name: "Raise Advisory Advisories",
        details: "Inject python venv audit warnings",
        output: "Successfully flagged requirements.txt. EOL package alert published."
      }]
    },
    brightdata: {
      target: "pypi/Flask",
      routed: 21,
      pool: "Bright Data Web Unlocker Core",
      bytes: 112400,
      scraped: "Parsed Pallets Project release guidelines\nPulled session storage CVE databases."
    },
    logs: [
      "[Bright Data] Navigating pypi.org API pipelines...",
      "[Bright Data] Pulling Werkzeug WSGI vulnerability advisory logs...",
      "[Cognee Ingest] Storing Python module metadata relationships...",
      "[AI Chain] Formulating Python 3.10 requirements upgrade diffs... Complete.",
      "[TriggerWare Action] Generated PyPA alert notification."
    ]
  },
  "gpl-compliance-lib": {
    package: "gpl-compliance-lib",
    ecosystem: "npm",
    version: "1.0.0",
    cve: "None (Copyleft Risk)",
    severity: "High",
    score: 85,
    summary: "Viral GPL-3.0 License detected. Using GPL-3.0 libraries within closed proprietary products poses high legal risks.",
    steps: [
      {
        name: "Step 1: Summarize Licensing Conditions",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "GPL-3.0 is a strong copyleft license. Incorporating this library into proprietary IP legally obligates open-sourcing your entire application."
      },
      {
        name: "Step 2: Extract Licensing Risks",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Viral license trigger on proprietary commercial software."
      },
      {
        name: "Step 3: Cross-Reference Codebase Usage",
        model: "Gemini 1.5 Pro",
        status: "success",
        output: "Codebase imports 'gpl-compliance-lib' in 'src/index.ts'."
      },
      {
        name: "Step 4: Generate Operational Remediation",
        model: "Gemini 1.5 Pro",
        status: "success",
        isDiff: true,
        beforeCode: '"dependencies": {\n  "gpl-compliance-lib": "^1.0.0"\n}',
        afterCode: '"dependencies": {\n  "mit-approved-checker": "^1.2.0"\n}',
        affectedFile: "package.json",
        explanation: "Replace GPL-3.0-only library with MIT-licensed alternatives."
      },
      {
        name: "Step 5: Score Security Severity",
        model: "Gemini 1.5 Flash",
        status: "success",
        output: "Legal Risk score: 85/100. Severity: HIGH."
      }
    ],
    cognee: {
      nodes: [
        { id: "g1", label: "Package", name: "gpl-compliance-lib" },
        { id: "g2", label: "License", name: "GPL-3.0-only" },
        { id: "g3", label: "Policy", name: "Proprietary Commercial Approved List" },
        { id: "g4", label: "Action", name: "Subst with MIT Alternate" }
      ],
      edges: [
        { source: "g1", target: "g2", relation: "LICENSES_UNDER" },
        { source: "g3", target: "g2", relation: "OUTLAWS" },
        { source: "g4", target: "g1", relation: "REPLACES" }
      ],
      memoryReport: "Logged GPL-3.0 compliance alerts.\nMemory registers flag GPL modules to block production deployment scripts automatically."
    },
    triggerware: {
      correlationScore: 85,
      actions: [{
        name: "Legal Compliance Auditor Warning",
        details: "Block compilation with high licensing alerts",
        output: "Pipeline build halted: GPL-3.0 compliance violation triggered by 'gpl-compliance-lib'."
      }]
    },
    brightdata: {
      target: "npm/gpl-compliance-lib",
      routed: 5,
      pool: "Bright Data Web Unlocker Core",
      bytes: 21300,
      scraped: "Evaluated repository COPYING files and license blocks\nConfirmed strict copyleft GPL v3.0 metadata triggers."
    },
    logs: [
      "[Bright Data] Scraped licensing documents in target repo...",
      "[Cognee Ingest] Processing licensing entities in metadata models...",
      "[AI Chain] GPL-3.0 legal risk isolated... Generating MIT substitution payload.",
      "[TriggerWare Action] Halted CI build scripts due to viral compliance policy match."
    ]
  }
};
