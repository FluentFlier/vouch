#!/usr/bin/env node
/**
 * Vouch Overwatcher Hook for Claude Code
 *
 * Hooks into Claude Code's PostToolUse (Write/Edit) to scan every
 * file the AI writes, BEFORE it's committed. Flags secrets, PII,
 * unsafe patterns, and AI-specific issues.
 *
 * Install: Add to .claude/settings.json hooks
 * Input: Receives tool_input JSON on stdin from Claude Code
 */

const SECRET_PATTERNS = [
  { name: 'AWS Access Key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/g },
  { name: 'OpenAI/Anthropic Key', regex: /sk-[A-Za-z0-9]{20,}/g },
  { name: 'Stripe Live Key', regex: /[sr]k_live_[A-Za-z0-9]{20,}/g },
  { name: 'Private Key', regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'Database URL', regex: /(?:postgres|mysql|mongodb|redis):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/g },
  { name: 'Slack Token', regex: /xox[baprs]-[0-9a-zA-Z-]{10,}/g },
  { name: 'SendGrid Key', regex: /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g },
  { name: 'Hardcoded Password', regex: /(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi },
];

const SAFETY_PATTERNS = [
  { name: 'eval()', regex: /\beval\s*\(/g, severity: 'CRITICAL' },
  { name: 'Disabled SSL', regex: /rejectUnauthorized\s*:\s*false/g, severity: 'WARNING' },
  { name: 'Wildcard CORS', regex: /(?:cors|origin)\s*[=:]\s*['"]\*['"]/gi, severity: 'WARNING' },
  { name: 'Wildcard IAM', regex: /"(?:Action|Resource)"\s*:\s*"\*"/g, severity: 'CRITICAL' },
];

const PLACEHOLDER_SKIP = [/test|fake|dummy|placeholder|example|changeme|xxx|your_/i];

const DANGEROUS_COMMANDS = [
  /rm\s+-rf\s+[\/~]/,
  /git\s+push\s+--force/,
  /git\s+reset\s+--hard/,
  /DROP\s+TABLE/i,
  /DROP\s+DATABASE/i,
  /TRUNCATE\s+TABLE/i,
  /curl.*\|\s*(?:bash|sh)/,
  /chmod\s+777/,
  />\s*\/etc\//,
  /dd\s+if=/,
];

function scanContent(content, filepath) {
  const findings = [];

  // Skip test files and scanner definition files
  const lower = filepath.toLowerCase();
  if (lower.includes('test') || lower.includes('spec') || lower.includes('fixture')) return findings;
  if (lower.includes('scanner') || lower.includes('detect') || lower.includes('guard')) return findings;

  for (const pat of SECRET_PATTERNS) {
    pat.regex.lastIndex = 0;
    let m;
    while ((m = pat.regex.exec(content)) !== null) {
      const val = m[1] || m[0];
      if (PLACEHOLDER_SKIP.some(p => p.test(val))) continue;
      const line = content.slice(0, m.index).split('\n').length;
      findings.push({ severity: 'CRITICAL', type: pat.name, line, message: `${pat.name} detected on line ${line}` });
    }
  }

  for (const pat of SAFETY_PATTERNS) {
    pat.regex.lastIndex = 0;
    let m;
    while ((m = pat.regex.exec(content)) !== null) {
      const line = content.slice(0, m.index).split('\n').length;
      findings.push({ severity: pat.severity, type: pat.name, line, message: `${pat.name} on line ${line}` });
    }
  }

  // SSN
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
    findings.push({ severity: 'CRITICAL', type: 'SSN', line: 0, message: 'Social Security Number in file' });
  }

  return findings;
}

function checkBashCommand(command) {
  const findings = [];
  for (const pat of DANGEROUS_COMMANDS) {
    if (pat.test(command)) {
      findings.push({ severity: 'WARNING', type: 'Dangerous command', message: `Potentially dangerous: ${command.slice(0, 80)}` });
    }
  }
  return findings;
}

// Main: read stdin and process
async function main() {
  const hookType = process.argv[2]; // 'post-edit' or 'pre-bash'

  let input = '';
  process.stdin.setEncoding('utf-8');

  await new Promise((resolve) => {
    process.stdin.on('data', chunk => input += chunk);
    process.stdin.on('end', resolve);
    // Timeout after 2s if no input
    setTimeout(resolve, 2000);
  });

  if (!input.trim()) {
    process.exit(0);
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch {
    process.exit(0);
  }

  if (hookType === 'post-edit') {
    // PostToolUse for Write/Edit -- scan the file content
    const filePath = data.tool_input?.file_path || data.tool_input?.filePath || '';
    const content = data.tool_input?.content || data.tool_input?.new_string || '';

    if (!content || !filePath) {
      process.exit(0);
    }

    const findings = scanContent(content, filePath);

    if (findings.length > 0) {
      const critical = findings.filter(f => f.severity === 'CRITICAL');
      const warnings = findings.filter(f => f.severity === 'WARNING');

      const parts = [];
      if (critical.length > 0) parts.push(`${critical.length} CRITICAL`);
      if (warnings.length > 0) parts.push(`${warnings.length} WARNING`);

      const details = findings.slice(0, 5).map(f => `  [${f.severity}] ${f.message}`).join('\n');

      // Output as JSON for Claude Code to display
      const output = {
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: `[VOUCH] Security issues in ${filePath.split('/').pop()}:\n${details}\n\nFix these before committing.`
        }
      };
      process.stdout.write(JSON.stringify(output));
    }
  }
  else if (hookType === 'pre-bash') {
    // PreToolUse for Bash -- check for dangerous commands
    const command = data.tool_input?.command || '';

    if (!command) {
      process.exit(0);
    }

    const findings = checkBashCommand(command);

    if (findings.length > 0) {
      const output = {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: `[VOUCH] ${findings[0].message}`
        }
      };
      process.stdout.write(JSON.stringify(output));
    }
  }

  process.exit(0);
}

main().catch(() => process.exit(0));
