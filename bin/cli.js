#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEST_BUY_HQ } from '../src/data/address.js';
import { getSandwichOptions } from '../src/order.js';
import { promptSelectOption, runDemoDelivery } from '../src/track.js';
import {
  createSpinner,
  printColdOpen,
  printDenied,
  printHelp,
  printOptions,
  c,
} from '../src/ui.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  const args = {
    command: null,
    granted: false,
    denied: false,
    help: false,
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

function printSignOff() {
  console.log(c.dim('Inspired by xkcd #149 — ') + c.cyan('https://xkcd.com/149/'));
  console.log();
}

async function maybeDemoOrder(options, { pick, address } = {}) {
  let selected = null;

  if (Number.isInteger(pick) && pick >= 1 && pick <= options.length) {
    selected = options[pick - 1];
  } else if (Number.isInteger(pick)) {
    console.error(c.yellow(`--pick must be between 1 and ${options.length}.`));
    return;
  } else {
    selected = await promptSelectOption(options);
  }

  if (!selected) {
    console.log(c.dim('No order placed. Sandwich remains theoretical.'));
    printSignOff();
    return;
  }

  await runDemoDelivery(selected, { address });
  printSignOff();
}

async function runGranted(address, { pick } = {}) {
  await printColdOpen();
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
    const { DEMO_SANDWICHES } = await import('../src/data/sandwiches.js');
    result = { source: 'demo', options: DEMO_SANDWICHES, address: address || null };
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
    });
  } else {
    printSignOff();
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

  await runGranted(args.address, { pick: args.pick });
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exitCode = 1;
});
