import { watch, readFileSync, statSync } from 'fs';
import path from 'path';
import { green, amber, red, dim, bold } from '../utils/colors.js';

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', '.next', '__pycache__', '.venv',
  'venv', '.cache', '.turbo', 'coverage', '.nyc_output',
]);

const SCAN_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.json', '.yaml', '.yml',
  '.env', '.toml', '.sh', '.sql', '.tf', '.hcl',
]);

// Inline scanner (lightweight, no subprocess)
function quickScan(content: string, filepath: string): { severity: string; message: string }[] {
  const findings: { severity: string; message: string }[] = [];

  // Secrets
  const secretPatterns: [RegExp, string][] = [
    [/AKIA[0-9A-Z]{16}/g, 'AWS Access Key'],
    [/gh[pousr]_[A-Za-z0-9_]{36,}/g, 'GitHub Token'],
    [/sk-[A-Za-z0-9]{20,}/g, 'API Key (OpenAI/Anthropic)'],
    [/[sr]k_live_[A-Za-z0-9]{20,}/g, 'Stripe Live Key'],
    [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/g, 'Private Key'],
    [/(?:postgres|mysql|mongodb|redis):\/\/[^\s'"]+:[^\s'"]+@/g, 'Database URL with credentials'],
    [/xox[baprs]-[0-9a-zA-Z-]{10,}/g, 'Slack Token'],
  ];

  const placeholderSkip = [/test|fake|dummy|placeholder|example|changeme|xxx|your_/i];

  for (const [regex, name] of secretPatterns) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const val = m[0];
      if (placeholderSkip.some((p) => p.test(val))) continue;
      findings.push({ severity: 'CRIT', message: `${name}: ${val.slice(0, 8)}...` });
    }
  }

  // AI patterns
  if (/rejectUnauthorized\s*:\s*false/.test(content)) {
    findings.push({ severity: 'WARN', message: 'Disabled SSL verification' });
  }
  if (/(?:cors|origin)\s*[=:]\s*['"]\*['"]/i.test(content)) {
    findings.push({ severity: 'WARN', message: 'Wildcard CORS (*)' });
  }
  if (/\beval\s*\(/.test(content)) {
    findings.push({ severity: 'CRIT', message: 'eval() usage' });
  }

  return findings;
}

function isScannable(filepath: string): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return SCAN_EXTENSIONS.has(ext) || filepath.includes('.env');
}

function formatTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
}

export async function runWatch(): Promise<void> {
  const targetDir = process.argv[3] || '.';
  const resolvedDir = path.resolve(targetDir);

  process.stdout.write('\n');
  process.stdout.write(bold(`  [vouch watch] Monitoring ${resolvedDir}\n`));
  process.stdout.write(dim('  Press Ctrl+C to stop\n\n'));

  const debounce = new Map<string, NodeJS.Timeout>();

  function handleFileChange(filepath: string): void {
    if (!isScannable(filepath)) return;

    // Debounce: wait 200ms after last change
    const existing = debounce.get(filepath);
    if (existing) clearTimeout(existing);

    debounce.set(filepath, setTimeout(() => {
      debounce.delete(filepath);

      try {
        const stat = statSync(filepath);
        if (!stat.isFile()) return;

        const content = readFileSync(filepath, 'utf-8');
        const findings = quickScan(content, filepath);
        const relPath = path.relative(resolvedDir, filepath);
        const time = formatTime();

        if (findings.length === 0) {
          process.stdout.write(`  ${dim(time)}  ${green('PASS')}   ${relPath.padEnd(40)} ${dim('0 issues')}\n`);
        } else {
          const crits = findings.filter((f) => f.severity === 'CRIT');
          const warns = findings.filter((f) => f.severity === 'WARN');

          if (crits.length > 0) {
            process.stdout.write(`  ${dim(time)}  ${red('CRIT')}   ${relPath.padEnd(40)} ${red(`${crits.length} critical`)}\n`);
            for (const f of crits) {
              process.stdout.write(`           ${red('\u2716')} ${f.message}\n`);
            }
          } else {
            process.stdout.write(`  ${dim(time)}  ${amber('WARN')}   ${relPath.padEnd(40)} ${amber(`${warns.length} warning(s)`)}\n`);
            for (const f of warns) {
              process.stdout.write(`           ${amber('\u26A0')} ${f.message}\n`);
            }
          }
        }
      } catch {
        // File may have been deleted between event and read
      }
    }, 200));
  }

  // Recursively watch directories
  function watchDir(dir: string): void {
    try {
      watch(dir, { recursive: true }, (_event, filename) => {
        if (!filename) return;
        const fullPath = path.join(dir, filename);
        const parts = filename.split(path.sep);
        if (parts.some((p) => IGNORE_DIRS.has(p))) return;
        handleFileChange(fullPath);
      });
    } catch {
      process.stderr.write(dim(`  Could not watch ${dir}\n`));
    }
  }

  watchDir(resolvedDir);

  // Keep the process alive
  await new Promise<void>(() => {
    process.on('SIGINT', () => {
      process.stdout.write(dim('\n  [vouch watch] Stopped.\n\n'));
      process.exit(0);
    });
  });
}
