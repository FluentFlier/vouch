import { readdirSync, readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { green, red, dim, bold } from '../utils/colors.js';

interface CheckResult {
  file: string;
  status: 'PASS' | 'FAIL';
  detail: string;
}

function findPolicyFiles(dir: string = '.'): string[] {
  const files: string[] = [];

  // Find YAML policy files
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.match(/vouch.*\.yaml$/) || entry.match(/.*\.policy\.yaml$/)) {
        files.push(path.join(dir, entry));
      }
    }
  } catch {
    // ignore
  }

  // Find Jac policy files
  const policyDirs = ['./policies/builtin', './policies'];
  for (const pd of policyDirs) {
    if (!existsSync(pd)) continue;
    try {
      const entries = readdirSync(pd);
      for (const entry of entries) {
        if (entry.endsWith('.jac')) {
          files.push(path.join(pd, entry));
        }
      }
    } catch {
      // ignore
    }
  }

  return files;
}

function checkYamlFile(filePath: string): CheckResult {
  try {
    const raw = readFileSync(filePath, 'utf-8');
    // Basic validation: must have agent and rules fields
    if (!raw.includes('agent:') || !raw.includes('rules:')) {
      return { file: filePath, status: 'FAIL', detail: 'Missing agent or rules field' };
    }

    // Count rules (simple heuristic)
    const ruleCount = (raw.match(/- name:/g) || []).length;
    return { file: filePath, status: 'PASS', detail: `${ruleCount} rules` };
  } catch (e) {
    return { file: filePath, status: 'FAIL', detail: String(e) };
  }
}

function checkJacFile(filePath: string): CheckResult {
  try {
    execSync(`jac check "${filePath}"`, { stdio: 'pipe' });
    return { file: filePath, status: 'PASS', detail: 'validated via Jac' };
  } catch (e) {
    const stderr = e instanceof Error && 'stderr' in e ? String((e as { stderr: unknown }).stderr) : '';
    const firstLine = stderr.split('\n')[0] || 'validation failed';
    return { file: filePath, status: 'FAIL', detail: firstLine.trim() };
  }
}

export async function runCheck(): Promise<void> {
  process.stdout.write('\n');
  process.stdout.write(bold('  VOUCH POLICY CHECK\n'));
  process.stdout.write('  ' + '\u2550'.repeat(46) + '\n\n');

  const files = findPolicyFiles();

  if (files.length === 0) {
    process.stdout.write('  No policy files found.\n');
    process.stdout.write('  Run ' + green('vouch init') + ' to create one.\n\n');
    process.exit(1);
  }

  const results: CheckResult[] = [];

  for (const file of files) {
    const result = file.endsWith('.jac') ? checkJacFile(file) : checkYamlFile(file);
    results.push(result);

    const icon = result.status === 'PASS' ? green('PASS') : red('FAIL');
    const name = file.padEnd(35);
    process.stdout.write(`  ${name} ${icon}   ${dim(result.detail)}\n`);
  }

  const failures = results.filter((r) => r.status === 'FAIL');
  process.stdout.write('\n');

  if (failures.length > 0) {
    process.stdout.write(red(`  ${failures.length} file(s) failed. Fix errors before deploying.\n`));
    process.stdout.write('\n');
    process.exit(1);
  }

  process.stdout.write(green('  All files passed.\n'));
  process.stdout.write('\n');
}
