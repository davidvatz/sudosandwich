import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { c, createOrderTracker } from './ui.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Hard cap for the whole demo delivery animation. */
export const MAX_DELIVERY_MS = 12_000;

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

/**
 * Random per-step durations that always sum to ≤ maxTotalMs.
 * Picks a random total budget (≈55–100% of the cap), then splits it
 * with random weights so steps stay varied.
 */
export function allocateStepDurations(stepCount, maxTotalMs = MAX_DELIVERY_MS) {
  if (stepCount <= 0) return [];

  const minTotal = Math.min(maxTotalMs, Math.max(stepCount * 200, Math.floor(maxTotalMs * 0.55)));
  const budget = minTotal + Math.floor(Math.random() * (maxTotalMs - minTotal + 1));
  const weights = Array.from({ length: stepCount }, () => 0.4 + Math.random());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const durations = weights.map((w) => Math.max(100, Math.floor((w / weightSum) * budget)));

  let sum = durations.reduce((a, b) => a + b, 0);
  if (sum > maxTotalMs) {
    const scale = maxTotalMs / sum;
    for (let i = 0; i < durations.length; i += 1) {
      durations[i] = Math.max(80, Math.floor(durations[i] * scale));
    }
    sum = durations.reduce((a, b) => a + b, 0);
  }
  while (sum > maxTotalMs) {
    const i = durations.indexOf(Math.max(...durations));
    durations[i] -= 1;
    sum -= 1;
  }
  return durations;
}

export function printSandwichCard(option) {
  console.log();
  console.log(`${c.bold(c.cyan(option.item))} ${c.dim('—')} ${c.bold(option.name)}`);
  if (option.description) {
    console.log(c.dim(`  ${option.description}`));
  } else {
    console.log(c.dim('  A sandwich. Bread. Filling. Ambition.'));
  }
  const meta = [option.price, option.eta, option.distance].filter(Boolean).join(' · ');
  if (meta) console.log(c.dim(`  ${meta}`));
  if (option.url) console.log(c.dim(`  → ${option.url}`));
  console.log();
}

/**
 * Interactive browse: pick → describe → order / back / skip.
 * Returns the option to order, or null if skipped.
 * `--pick` path should call with { preselected }.
 */
export async function promptBrowseAndOrder(options, { preselected = null } = {}) {
  if (!options?.length) return null;

  if (preselected) {
    printSandwichCard(preselected);
    // Non-interactive --pick: order immediately after showing the card.
    if (!input.isTTY || !output.isTTY) return preselected;
  }

  if (!input.isTTY || !output.isTTY) {
    return preselected;
  }

  const rl = createInterface({ input, output });
  const max = options.length;

  try {
    let selected = preselected;

    while (true) {
      if (!selected) {
        const hint = c.dim(` (1–${max}, or Enter to skip)`);
        const answer = (await rl.question(`${c.bold('Pick a sandwich')}${hint}: `)).trim();
        if (answer === '') return null;

        const n = Number.parseInt(answer, 10);
        if (!Number.isInteger(n) || n < 1 || n > max) {
          console.log(c.yellow(`  Need a number from 1 to ${max}.`));
          continue;
        }
        selected = options[n - 1];
        printSandwichCard(selected);
      }

      const confirm = (
        await rl.question(`${c.bold('Order it?')} ${c.dim('[Y/n/b]')}: `)
      )
        .trim()
        .toLowerCase();

      if (confirm === '' || confirm === 'y' || confirm === 'yes') {
        return selected;
      }
      if (confirm === 'n' || confirm === 'no' || confirm === 'q' || confirm === 'quit') {
        return null;
      }
      if (confirm === 'b' || confirm === 'back') {
        selected = null;
        continue;
      }
      console.log(c.yellow('  Enter Y to order, n to skip, or b to pick again.'));
    }
  } finally {
    rl.close();
  }
}

function isQuiet({ quiet } = {}) {
  return Boolean(quiet) || process.env.SUDO_SANDWICH_QUIET === '1';
}

function ringBell({ quiet } = {}) {
  if (isQuiet({ quiet })) return;
  try {
    process.stdout.write('\x07');
  } catch {
    // ignore
  }
}

/**
 * Tip the dasher gag. TTY only; non-interactive defaults to 20%.
 * @returns {Promise<string>} tip label for the receipt
 */
export async function promptTipDasher() {
  if (!input.isTTY || !output.isTTY) {
    return '20%';
  }

  const rl = createInterface({ input, output });
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const raw = (
        await rl.question(`${c.bold('Tip the dasher?')} ${c.dim('[20%/∞/sudo]')}: `)
      ).trim();
      const answer = raw.toLowerCase();

      if (raw === '' || answer === '20%' || answer === '20' || answer === '20 percent') {
        console.log(c.green('  Tip applied: 20%. Dasher grins in UTF-8.'));
        return '20%';
      }
      if (answer === '∞' || answer === 'infinity' || answer === 'inf' || answer === 'infinite') {
        console.log(
          c.magenta('  Tip applied: ∞. Dasher has retired to a yacht made of tip jars.')
        );
        return '∞';
      }
      if (answer === 'sudo') {
        console.log(
          c.yellow('  Tip applied with root privileges. Dasher is now uid=0(grateful).')
        );
        return 'sudo';
      }

      if (attempt === 0) {
        console.log(c.dim('  Try 20%, ∞, or sudo — or just hit Enter for 20%.'));
      }
    }
    console.log(c.green('  Defaulting to 20%. Dasher accepts your vibes.'));
    return '20%';
  } finally {
    rl.close();
  }
}

function randomOrderSuffix() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 4; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Narrow ASCII receipt for sharing / screenshots. */
export function printReceipt(option, { tip = '20%' } = {}) {
  const orderId = `XKCD-149-${randomOrderSuffix()}`;
  const inner = 25;
  const row = (text) => {
    const s = String(text ?? '');
    const clipped = s.length > inner ? s.slice(0, inner) : s;
    return `│  ${clipped}${' '.repeat(inner - clipped.length)}│`;
  };

  const lines = [
    `┌${'─'.repeat(inner + 2)}┐`,
    row('SUDO SANDWICH RECEIPT'),
    row(`ORDER #${orderId}`),
    row(option.item ?? 'Sandwich'),
    row(option.name ?? 'Unknown shop'),
    row(`Tip: ${tip}`),
    row('Status: DELIVERED'),
    `└${'─'.repeat(inner + 2)}┘`,
  ];

  console.log();
  for (const line of lines) console.log(c.dim(line));
  console.log();
}

/**
 * Run the demo delivery timeline for a selected sandwich.
 * Total animation time is capped at MAX_DELIVERY_MS (12s).
 */
export async function runDemoDelivery(option, { address, quiet = false } = {}) {
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
  const durations = allocateStepDurations(total, MAX_DELIVERY_MS);
  const tracker = createOrderTracker({ total }).start();

  for (const [index, step] of DEMO_TRACK_STEPS.entries()) {
    const durationMs = durations[index];
    tracker.beginStep({ label: step.label, index, durationMs });
    await sleep(durationMs);
    tracker.endStep();
  }

  tracker.finish();
  ringBell({ quiet });
  console.log();
  console.log(c.bold(c.green('🥪  Sandwich delivered. sudo complete.')));
  const enjoy = /^the\s/i.test(option.item)
    ? `Enjoy ${option.item}.`
    : `Enjoy the ${option.item}.`;
  console.log(c.dim(`  ${enjoy} Don't forget to tip the dasher (in real life).`));
  console.log();

  const tip = await promptTipDasher();
  printReceipt(option, { tip });
}
