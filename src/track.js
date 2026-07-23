import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { c, createOrderTracker } from './ui.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pithy demo delivery beats — short, punchy, terminal-native. */
export const DEMO_TRACK_STEPS = [
  { label: 'Yeeting order into the void…' },
  { label: 'Merchant blinked. Order received.' },
  { label: 'Knife vs. bread. Bread losing.' },
  { label: 'Dasher acquired. GPS negotiating.' },
  { label: 'Out for delivery. Sandwich en route.' },
  { label: 'Approaching. Resist fridge raids.' },
  { label: 'Handed off. Privilege escalated.' },
];

/** Random dwell time per step (~1–5 seconds). */
function randomStepMs() {
  return 1000 + Math.floor(Math.random() * 4001);
}

/**
 * Prompt user to pick a sandwich option (1-based). Returns the option or null if skipped.
 */
export async function promptSelectOption(options, { allowSkip = true } = {}) {
  if (!options?.length) return null;

  // Non-interactive: skip selection unless --pick=N was used by caller
  if (!input.isTTY || !output.isTTY) {
    return null;
  }

  const rl = createInterface({ input, output });
  const max = options.length;
  const hint = allowSkip
    ? c.dim(` (1–${max}, or Enter to skip)`)
    : c.dim(` (1–${max})`);

  try {
    while (true) {
      const answer = (await rl.question(`${c.bold('Pick a sandwich')}${hint}: `)).trim();
      if (allowSkip && answer === '') return null;

      const n = Number.parseInt(answer, 10);
      if (Number.isInteger(n) && n >= 1 && n <= max) {
        return options[n - 1];
      }
      console.log(c.yellow(`  Need a number from 1 to ${max}.`));
    }
  } finally {
    rl.close();
  }
}

/**
 * Run the demo delivery timeline for a selected sandwich.
 */
export async function runDemoDelivery(option, { address } = {}) {
  console.log();
  console.log(
    `${c.bold('Ordering')} ${c.cyan(option.item)} ${c.bold('from')} ${c.cyan(option.name)}…`
  );
  if (option.price) {
    console.log(c.dim(`  ${option.price} · demo checkout · no real charge`));
  }
  if (address) {
    console.log(c.dim(`  → ${address}`));
  }
  const total = DEMO_TRACK_STEPS.length;
  const tracker = createOrderTracker({ total }).start();

  for (const [index, step] of DEMO_TRACK_STEPS.entries()) {
    const durationMs = randomStepMs();
    tracker.beginStep({ label: step.label, index, durationMs });
    await sleep(durationMs);
    tracker.endStep();
  }

  tracker.finish();
  console.log();
  console.log(c.bold(c.green('🥪  Sandwich delivered. sudo complete.')));
  const enjoy = /^the\s/i.test(option.item)
    ? `Enjoy ${option.item}.`
    : `Enjoy the ${option.item}.`;
  console.log(c.dim(`  ${enjoy} Don't forget to tip the dasher (in real life).`));
  console.log();
}
