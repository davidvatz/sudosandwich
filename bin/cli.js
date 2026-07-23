#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEST_BUY_HQ } from '../src/data/address.js';
import { getSandwichOptions } from '../src/order.js';
import { promptBrowseAndOrder, runDemoDelivery } from '../src/track.js';
import {
  createSpinner,
  printColdOpen,
  printDenied,
  printHelp,
  printOptions,
  c,
} from '../src/ui.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function countSudoInCommand(cmd) {
  if (!cmd) return 0;
  return (String(cmd).match(/\bsudo\b/gi) || []).length;
}

function detectSudoSudo(argv) {
  if (argv.includes('--sudo-sudo')) return true;
  // e.g. user somehow passed a literal "sudo" token after the binary
  if (argv.some((a) => a === 'sudo')) return true;
  // Outer + nested sudo often leaves SUDO_COMMAND with sudo more than once
  if (process.env.SUDO_USER && countSudoInCommand(process.env.SUDO_COMMAND) > 1) {
    return true;
  }
  return false;
}

function parseArgs(argv) {
  const args = {
    command: null,
    granted: false,
    denied: false,
    help: false,
    quiet: false,
    sudoSudo: detectSudoSudo(argv),
    pick: null,
    address:
      process.env.SUDO_SANDWICH_ADDRESS ||
      process.env.DOORDASH_ADDRESS ||
      BEST_BUY_HQ.address,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === 'init') {
      args.command = 'init';
    } else if (a === '--granted' || a === '-g') {
      args.granted = true;
    } else if (a === '--denied' || a === '-d') {
      args.denied = true;
    } else if (a === '--help' || a === '-h') {
      args.help = true;
    } else if (a === '--quiet' || a === '-q') {
      args.quiet = true;
    } else if (a === '--sudo-sudo') {
      args.sudoSudo = true;
    } else if (a === '--pick' || a === '-p') {
      args.pick = Number.parseInt(argv[i + 1], 10);
      i += 1;
    } else if (a.startsWith('--pick=')) {
      args.pick = Number.parseInt(a.slice('--pick='.length), 10);
    } else if (a === '--address') {
      args.address = argv[i + 1] || null;
      i += 1;
    } else if (a.startsWith('--address=')) {
      args.address = a.slice('--address='.length) || null;
    }
  }

  return args;
}

function isElevated() {
  if (process.env.SUDO_USER) return true;
  try {
    if (typeof process.getuid === 'function' && process.getuid() === 0) return true;
  } catch {
    // ignore
  }
  return false;
}

function printInit() {
  const path = join(__dirname, '..', 'src', 'shell', 'init.zsh');
  process.stdout.write(readFileSync(path, 'utf8'));
}

function printSignOff({ sudoSudo = false } = {}) {
  if (sudoSudo) {
    console.log(c.dim('Double-sudo complete. Lunch scheduling class: realtime.'));
  }
  console.log(c.dim('Inspired by xkcd #149 — ') + c.cyan('https://xkcd.com/149/'));
  console.log();
}

async function maybeDemoOrder(options, { pick, address, quiet, sudoSudo } = {}) {
  let preselected = null;

  if (Number.isInteger(pick) && pick >= 1 && pick <= options.length) {
    preselected = options[pick - 1];
  } else if (Number.isInteger(pick)) {
    console.error(c.yellow(`--pick must be between 1 and ${options.length}.`));
    return;
  }

  const selected = await promptBrowseAndOrder(options, { preselected });

  if (!selected) {
    console.log(c.dim('No order placed. Sandwich remains theoretical.'));
    printSignOff({ sudoSudo });
    return;
  }

  await runDemoDelivery(selected, { address, quiet });
  printSignOff({ sudoSudo });
}

async function runGranted(address, { pick, quiet, sudoSudo } = {}) {
  await printColdOpen({ sudoSudo });
  const spinner = createSpinner('Flibbertigibbeting...').start();
  let result;
  try {
    result = await getSandwichOptions({ address });
    spinner.stop(
      result.source === 'live'
        ? `Found live options via ${result.provider}`
        : 'Demo sandwich board ready'
    );
  } catch (err) {
    spinner.stop('Fell back to demo board');
    const { pickRandomSandwiches } = await import('../src/data/sandwiches.js');
    result = {
      source: 'demo',
      options: pickRandomSandwiches(5),
      address: address || null,
    };
    if (process.env.DEBUG) {
      console.error(err);
    }
  }

  await printOptions(result.options, {
    source: result.source,
    address: result.address,
  });

  // Interactive / --pick demo checkout for demo boards (and when --pick is set).
  if (result.source === 'demo' || Number.isInteger(pick)) {
    await maybeDemoOrder(result.options, {
      pick,
      address: result.address || address,
      quiet,
      sudoSudo,
    });
  } else {
    printSignOff({ sudoSudo });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.command === 'init') {
    printInit();
    return;
  }

  if (args.denied) {
    printDenied();
    process.exitCode = 1;
    return;
  }

  // Grant when: --granted, real sudo, or default `npx sudo-sandwich` UX.
  // Strict xkcd mode (refuse unless elevated): SUDO_SANDWICH_REQUIRE_SUDO=1
  const shouldGrant =
    args.granted ||
    isElevated() ||
    process.env.SUDO_SANDWICH_REQUIRE_SUDO !== '1';

  if (!shouldGrant) {
    printDenied();
    process.exitCode = 1;
    return;
  }

  await runGranted(args.address, {
    pick: args.pick,
    quiet: args.quiet,
    sudoSudo: args.sudoSudo,
  });
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
