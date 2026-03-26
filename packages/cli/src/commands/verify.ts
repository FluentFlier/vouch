import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';
import { green, amber, red, dim, bold, cyan } from '../utils/colors.js';

// Inline trust score computation (same logic as core, avoids cross-package import issues in CLI)
interface Finding {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  type: string;
  line: number;
  message: string;
  fix: string;
  isAiPattern: boolean;
}

interface FileResult {
  file: string;
  score: number;
  findings: Finding[];
  lines: number;
}

const IGNORE = new Set(['node_modules', '.git', 'dist', '.next', '__pycache__', '.venv', 'venv', '.cache', '.turbo', 'coverage']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.yaml', '.yml', '.sh', '.sql', '.tf']);

function isScannable(f: string): boolean {
  return EXTS.has(path.extname(f).toLowerCase()) || f.includes('.env');
}

function isTestFile(f: string): boolean {
  const l = f.toLowerCase();
  return l.includes('test') || l.includes('spec') || l.includes('__tests__') || l.includes('fixture');
}

function walkDir(dir: string, files: string[]): void {
  try {
    for (const entry of readdirSync(dir)) {
      if (IGNORE.has(entry) || entry.startsWith('.')) continue;
      const full = path.join(dir, entry);
      try {
        const s = statSync(full);
        if (s.isDirectory()) walkDir(full, files);
        else if (s.isFile() && isScannable(full)) files.push(full);
      } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

// Secret patterns
const SECRETS: [RegExp, string, string][] = [
  [/AKIA[0-9A-Z]{16}/g, 'AWS Access Key', 'Move to process.env.AWS_ACCESS_KEY_ID'],
  [/gh[pousr]_[A-Za-z0-9_]{36,}/g, 'GitHub Token', 'Move to process.env.GITHUB_TOKEN'],
  [/sk-[A-Za-z0-9]{20,}/g, 'OpenAI/Anthropic Key', 'Move to process.env.API_KEY'],
  [/[sr]k_live_[A-Za-z0-9]{20,}/g, 'Stripe Live Key', 'Move to process.env.STRIPE_SECRET_KEY'],
  [/-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, 'Private Key', 'Move to .env file (never commit)'],
  [/(?:postgres|mysql|mongodb|redis):\/\/[^\s'"]+:[^\s'"]+@[^\s'"]+/g, 'Database URL', 'Move to process.env.DATABASE_URL'],
  [/xox[baprs]-[0-9a-zA-Z-]{10,}/g, 'Slack Token', 'Move to process.env.SLACK_TOKEN'],
  [/(?:password|passwd|pwd)\s*[=:]\s*['"]([^'"]{8,})['"]/gi, 'Hardcoded Password', 'Move to environment variable or secret manager'],
];

const SAFETY: [RegExp, string, string, 'CRITICAL' | 'WARNING' | 'INFO'][] = [
  [/\beval\s*\(/g, 'eval() usage', 'Use JSON.parse() for data or Function() for dynamic code', 'CRITICAL'],
  [/\.innerHTML\s*=/g, 'innerHTML assignment', 'Use textContent or sanitize with DOMPurify', 'WARNING'],
  [/rejectUnauthorized\s*:\s*false/g, 'Disabled SSL', 'Set rejectUnauthorized: true', 'WARNING'],
  [/(?:cors|origin)\s*[=:]\s*['"]\*['"]/gi, 'Wildcard CORS', 'Set specific origin via process.env.CORS_ORIGIN', 'WARNING'],
  [/chmod\s+777/g, 'chmod 777', 'Use minimum permissions (755 or 644)', 'WARNING'],
  [/"(?:Action|Resource)"\s*:\s*"\*"/g, 'Wildcard IAM', 'Use least-privilege permissions', 'CRITICAL'],
];

const PLACEHOLDER_SKIP = [/test|fake|dummy|placeholder|example|changeme|xxx|your_/i];

function scanFile(filepath: string): FileResult {
  let content: string;
  try { content = readFileSync(filepath, 'utf-8'); } catch { return { file: filepath, score: 100, findings: [], lines: 0 }; }

  const lines = content.split('\n').length;
  const findings: Finding[] = [];
  const isTF = isTestFile(filepath);

  // Secrets
  for (const [regex, name, fix] of SECRETS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const val = m[1] ?? m[0];
      if (PLACEHOLDER_SKIP.some((p) => p.test(val))) continue;
      const line = content.slice(0, m.index).split('\n').length;
      findings.push({ severity: 'CRITICAL', type: name, line, message: `${name} detected`, fix, isAiPattern: false });
    }
  }

  // Safety
  for (const [regex, name, fix, sev] of SAFETY) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      if (filepath.includes('scanner')) continue; // Skip scanner definition files
      const line = content.slice(0, m.index).split('\n').length;
      findings.push({ severity: sev, type: name, line, message: name, fix, isAiPattern: sev === 'WARNING' });
    }
  }

  // AI patterns
  if (/(?:const|let|var)\s+\w+\s*=\s*['"](?:postgres|mysql|mongodb|redis|https?):\/\/[^'"]+['"]/.test(content) && !filepath.includes('.env')) {
    const idx = content.search(/(?:const|let|var)\s+\w+\s*=\s*['"](?:postgres|mysql|mongodb|redis|https?):\/\//);
    if (idx >= 0) {
      const line = content.slice(0, idx).split('\n').length;
      findings.push({ severity: 'WARNING', type: 'Inlined URL', line, message: 'URL hardcoded instead of env var', fix: 'Use process.env.VARIABLE_NAME', isAiPattern: true });
    }
  }

  // Error handling
  const fetchRegex = /(?:await\s+)?fetch\s*\(/g;
  let fetchM: RegExpExecArray | null;
  while ((fetchM = fetchRegex.exec(content)) !== null) {
    const before = content.slice(Math.max(0, fetchM.index - 200), fetchM.index);
    if (!before.includes('try') && !before.includes('catch') && !before.includes('.catch')) {
      const line = content.slice(0, fetchM.index).split('\n').length;
      findings.push({ severity: 'WARNING', type: 'Unhandled fetch', line, message: 'fetch() without error handling', fix: 'Wrap in try/catch or add .catch()', isAiPattern: true });
    }
  }

  // PII
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
    const idx = content.search(/\b\d{3}-\d{2}-\d{4}\b/);
    const line = content.slice(0, idx).split('\n').length;
    findings.push({ severity: 'CRITICAL', type: 'SSN', line, message: 'Social Security Number in source', fix: 'Remove SSN from source code immediately', isAiPattern: false });
  }

  // Score
  const mult = isTF ? 0.5 : 1;
  let critD = 0, warnD = 0, infoD = 0;
  for (const f of findings) {
    if (f.severity === 'CRITICAL') critD += 15 * mult;
    else if (f.severity === 'WARNING') warnD += 5 * mult;
    else infoD += 1 * mult;
  }
  critD = Math.min(critD, 60);
  warnD = Math.min(warnD, 25);
  infoD = Math.min(infoD, 10);
  const score = Math.max(0, Math.round(100 - critD - warnD - infoD));

  return { file: filepath, score, findings, lines };
}

function scoreColor(score: number): (s: string) => string {
  if (score >= 80) return green;
  if (score >= 50) return amber;
  return red;
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'PASS';
  if (score >= 50) return 'WARNING';
  return 'CRITICAL';
}

export async function runVerify(): Promise<void> {
  const args = process.argv.slice(3);
  const targetPaths = args.filter((a) => !a.startsWith('-'));
  const jsonMode = args.includes('--json');
  const showAll = args.includes('--all');

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(`
  vouch verify [paths...] [options]

  Compute trust scores for every file in your codebase.
  Each file gets a score from 0-100 with line-by-line findings.

  Options:
    --json     Output as JSON
    --all      Show all files (default: only files with findings)
    --help     Show this help

  Examples:
    vouch verify              Verify current directory
    vouch verify src/         Verify specific directory
    vouch verify --json       Machine-readable output
    vouch verify --all        Show clean files too

`);
    return;
  }

  const paths = targetPaths.length > 0 ? targetPaths : ['.'];
  const start = Date.now();

  // Collect files
  const allFiles: string[] = [];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    const s = statSync(p);
    if (s.isFile()) allFiles.push(p);
    else if (s.isDirectory()) walkDir(p, allFiles);
  }

  if (allFiles.length === 0) {
    process.stdout.write(dim('\n  No scannable files found.\n\n'));
    return;
  }

  // Scan all files
  const results: FileResult[] = [];
  for (const f of allFiles) {
    results.push(scanFile(f));
  }
  results.sort((a, b) => a.score - b.score);

  const timeMs = Date.now() - start;
  const baseDir = paths[0] === '.' ? process.cwd() : path.resolve(paths[0]);

  // Codebase score (weighted by LOC, files >= 5 lines)
  const scored = results.filter((r) => r.lines >= 5);
  const totalLines = scored.reduce((s, r) => s + r.lines, 0);
  const codebaseScore = totalLines > 0
    ? Math.round(scored.reduce((s, r) => s + r.score * r.lines, 0) / totalLines)
    : 100;

  const critFiles = results.filter((r) => r.score < 50);
  const warnFiles = results.filter((r) => r.score >= 50 && r.score < 80);
  const cleanFiles = results.filter((r) => r.score >= 80);

  if (jsonMode) {
    process.stdout.write(JSON.stringify({
      codebaseTrustScore: codebaseScore,
      totalFiles: results.length,
      criticalFiles: critFiles.length,
      warningFiles: warnFiles.length,
      cleanFiles: cleanFiles.length,
      scanTimeMs: timeMs,
      files: results.map((r) => ({
        file: path.relative(baseDir, r.file),
        score: r.score,
        lines: r.lines,
        findings: r.findings.map((f) => ({
          severity: f.severity,
          type: f.type,
          line: f.line,
          message: f.message,
          fix: f.fix,
          isAiPattern: f.isAiPattern,
        })),
      })),
    }, null, 2) + '\n');
    process.exit(codebaseScore < 50 ? 2 : codebaseScore < 80 ? 1 : 0);
    return;
  }

  // Pretty output
  process.stdout.write('\n');
  process.stdout.write(bold(`  VOUCH VERIFY`) + dim(`  ${allFiles.length} files  ${(timeMs / 1000).toFixed(1)}s\n`));
  process.stdout.write('  ' + '\u2550'.repeat(50) + '\n\n');

  // Codebase score
  const sc = scoreColor(codebaseScore);
  process.stdout.write(`  CODEBASE TRUST SCORE: ${sc(bold(`${codebaseScore}/100`))}\n\n`);

  // File details (only files with findings, unless --all)
  const toShow = showAll ? results : results.filter((r) => r.findings.length > 0);

  for (const r of toShow) {
    const relPath = path.relative(baseDir, r.file);
    const fc = scoreColor(r.score);
    const label = scoreLabel(r.score);
    process.stdout.write(`  ${relPath.padEnd(45)} ${fc(`${r.score}/100`)}  ${fc(label)}\n`);

    for (const f of r.findings) {
      const sev = f.severity === 'CRITICAL' ? red('CRIT') : f.severity === 'WARNING' ? amber('WARN') : dim('INFO');
      const ai = f.isAiPattern ? amber(' [AI]') : '';
      process.stdout.write(`    ${sev} Line ${String(f.line).padEnd(4)} ${f.message}${ai}\n`);
      process.stdout.write(`         ${dim('FIX: ' + f.fix)}\n`);
    }
    if (r.findings.length > 0) process.stdout.write('\n');
  }

  // Summary
  process.stdout.write('  ' + '\u2500'.repeat(50) + '\n');
  process.stdout.write(`  Files: ${critFiles.length > 0 ? red(`${critFiles.length} critical`) : ''}${critFiles.length > 0 && warnFiles.length > 0 ? ', ' : ''}${warnFiles.length > 0 ? amber(`${warnFiles.length} warning`) : ''}${(critFiles.length > 0 || warnFiles.length > 0) && cleanFiles.length > 0 ? ', ' : ''}${green(`${cleanFiles.length} clean`)}\n\n`);

  // Exit code
  if (critFiles.length > 0) process.exit(2);
  if (warnFiles.length > 0) process.exit(1);
}
