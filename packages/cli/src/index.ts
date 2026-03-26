#!/usr/bin/env node

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case 'init': {
      const { runInit } = await import('./commands/init.js');
      await runInit();
      break;
    }
    case 'scan': {
      const { runScan } = await import('./commands/scan.js');
      await runScan();
      break;
    }
    case 'watch': {
      const { runWatch } = await import('./commands/watch.js');
      await runWatch();
      break;
    }
    case 'check': {
      const { runCheck } = await import('./commands/check.js');
      await runCheck();
      break;
    }
    case 'report': {
      const { runReport } = await import('./commands/report.js');
      await runReport();
      break;
    }
    default:
      process.stdout.write(`
  vouch - Runtime safety for AI agents and AI-generated code

  Security Scanning:
    scan      Scan files for secrets, PII, injection patterns, unsafe code
    watch     Real-time file watcher with live security scanning

  Policy Management:
    init      Initialize Vouch in your project (+ pre-commit hooks)
    check     Validate all policy files
    report    View your agent's behavioral report

  Usage:
    vouch scan                  Scan current directory
    vouch scan --staged         Scan staged git changes (pre-commit)
    vouch scan --json           Machine-readable output for CI
    vouch watch                 Watch files and scan on every save
    vouch watch src/            Watch specific directory
    vouch init                  Set up Vouch in your project
    vouch check                 Validate policy files

  MCP Server (for AI coding tools):
    npx vouch-mcp               Start the MCP server for Claude Code / Cursor

`);
      if (command && command !== '--help' && command !== '-h') {
        process.exit(1);
      }
  }
}

main().catch((e) => {
  process.stderr.write(`Error: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
