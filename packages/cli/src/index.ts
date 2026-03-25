#!/usr/bin/env node

const command = process.argv[2];

async function main(): Promise<void> {
  switch (command) {
    case 'init': {
      const { runInit } = await import('./commands/init.js');
      await runInit();
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
  vouch - Runtime behavioral safety for AI agents

  Commands:
    init      Initialize Vouch in your project
    check     Validate all policy files
    report    View your agent's behavioral report

  Usage:
    vouch init
    vouch check
    vouch report

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
