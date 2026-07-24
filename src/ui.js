const ESC = '\x1b[';
const supportsColor =
  process.stdout.isTTY &&
  process.env.FORCE_COLOR !== '0' &&
  process.env.NO_COLOR == null;

const wrap = (code, text) =>
  supportsColor ? `${ESC}${code}m${text}${ESC}0m` : text;

export const c = {
  bold: (t) => wrap('1', t),
  dim: (t) => wrap('2', t),
  red: (t) => wrap('31', t),
  green: (t) => wrap('32', t),
  yellow: (t) => wrap('33', t),
  blue: (t) => wrap('34', t),
  magenta: (t) => wrap('35', t),
  cyan: (t) => wrap('36', t),
  white: (t) => wrap('37', t),
};

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function renderProgressBar(fraction, { width = 24 } = {}) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const filled = Math.round(clamped * width);
  const empty = width - filled;
  const bar = `${'█'.repeat(filled)}${'░'.repeat(empty)}`;
  const pct = `${Math.round(clamped * 100)}%`.padStart(4);
  return `${c.cyan('[')}${c.green(bar)}${c.cyan(']')} ${c.bold(pct)}`;
}

export function createSpinner(label = 'Flibbertigibbeting...') {
  let i = 0;
  let timer = null;
  const write = (msg) => {
    if (process.stderr.isTTY) {
      process.stderr.write(`\r${ESC}K${msg}`);
    }
  };

  return {
    start() {
      if (!process.stderr.isTTY) {
        process.stderr.write(`${label}\n`);
        return this;
      }
      timer = setInterval(() => {
        const frame = SPINNER_FRAMES[i % SPINNER_FRAMES.length];
        write(`${c.cyan(frame)} ${c.dim(label)}`);
        i += 1;
      }, 80);
      return this;
    },
    stop(finalMessage) {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (finalMessage) {
        if (process.stderr.isTTY) {
          write(`${c.green('✔')} ${finalMessage}\n`);
        } else {
          process.stderr.write(`${c.green('✔')} ${finalMessage}\n`);
        }
      } else if (process.stderr.isTTY) {
        write('');
        process.stderr.write('\r');
      }
    },
  };
}

/**
 * Single overall progress bar + separate status lines beneath it.
 *
 *   Overall order progress
 *   [████████░░░░░░░░░░░░░░░░]  43%
 *
 *   ✔ Yeeting order into the void…
 *   ⠋ Merchant blinked. Order received.
 */
export function createOrderTracker({ total }) {
  let completed = 0;
  let frame = 0;
  let timer = null;
  let label = '';
  let durationMs = 1;
  let stepStarted = 0;
  let stepIndex = 0;
  const tty = Boolean(process.stderr.isTTY);

  const writeStatus = (msg) => {
    if (tty) {
      process.stderr.write(`\r${ESC}K${msg}`);
    } else {
      process.stderr.write(`${msg}\n`);
    }
  };

  const paintBar = (fraction) => {
    const bar = renderProgressBar(fraction);
    if (!tty) {
      process.stderr.write(`${bar}\n`);
      return;
    }
    // From the active status line: blank line + completed statuses above → bar.
    const up = 2 + completed;
    process.stderr.write(`${ESC}${up}A`);
    process.stderr.write(`\r${ESC}K${bar}`);
    process.stderr.write(`${ESC}${up}B`);
    process.stderr.write(`\r`);
  };

  const fractionNow = () => {
    const elapsed = Date.now() - stepStarted;
    const within = Math.min(1, Math.max(0, elapsed / durationMs));
    return (stepIndex + within) / total;
  };

  return {
    start() {
      process.stderr.write(`\n${c.bold('Overall order progress')}\n`);
      process.stderr.write(`${renderProgressBar(0)}\n`);
      process.stderr.write('\n');
      return this;
    },

    beginStep({ label: nextLabel, index, durationMs: ms }) {
      label = nextLabel;
      stepIndex = index;
      durationMs = Math.max(1, ms);
      stepStarted = Date.now();
      frame = 0;

      if (!tty) {
        return this;
      }

      writeStatus(`  ${c.cyan(SPINNER_FRAMES[0])} ${c.dim(label)}`);
      timer = setInterval(() => {
        frame += 1;
        paintBar(fractionNow());
        const spin = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
        writeStatus(`  ${c.cyan(spin)} ${c.dim(label)}`);
      }, 80);
      return this;
    },

    endStep() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      const fraction = (stepIndex + 1) / total;
      if (tty) {
        // Still on the active status line — paint bar before we finalize + newline.
        paintBar(fraction);
        writeStatus(`  ${c.green('✔')} ${label}\n`);
      } else {
        process.stderr.write(`  ${c.green('✔')} ${label}\n`);
      }
      completed = stepIndex + 1;
    },

    finish() {
      // Cursor sits on a fresh line under the last status; nudge bar to 100%.
      if (tty) {
        const up = 2 + completed;
        process.stderr.write(`${ESC}${up}A`);
        process.stderr.write(`\r${ESC}K${renderProgressBar(1)}`);
        process.stderr.write(`${ESC}${up}B`);
        process.stderr.write('\n');
      } else {
        process.stderr.write(`${renderProgressBar(1)}\n`);
      }
    },
  };
}

function pad(str, len) {
  const s = String(str ?? '');
  if (s.length >= len) return s.slice(0, len);
  return s + ' '.repeat(len - s.length);
}

function visibleLen(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, '').length;
}

function truncateVisible(str, len) {
  const s = String(str ?? '');
  if (visibleLen(s) <= len) return s;
  // Truncate by visible chars (ANSI-safe): keep codes, drop overflow text.
  let out = '';
  let seen = 0;
  const re = /\x1b\[[0-9;]*m/g;
  let last = 0;
  let match;
  while ((match = re.exec(s)) !== null) {
    for (const ch of s.slice(last, match.index)) {
      if (seen >= len) return out;
      out += ch;
      seen += 1;
    }
    out += match[0];
    last = match.index + match[0].length;
  }
  for (const ch of s.slice(last)) {
    if (seen >= len) break;
    out += ch;
    seen += 1;
  }
  return out;
}

function padVisible(str, len) {
  const s = truncateVisible(str, len);
  const extra = len - visibleLen(s);
  return extra > 0 ? s + ' '.repeat(extra) : s;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Split a string into typewriter tokens: ANSI escapes as atomic chunks,
 * everything else one character at a time (including emoji / combining marks
 * via [...str] so we don't split surrogate pairs).
 */
function typeTokens(text) {
  const tokens = [];
  const re = /\x1b\[[0-9;]*m/g;
  let last = 0;
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push(...[...text.slice(last, match.index)]);
    }
    tokens.push(match[0]);
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    tokens.push(...[...text.slice(last)]);
  }
  return tokens;
}

function shouldTypewrite() {
  if (process.env.SUDO_SANDWICH_NO_TYPE === '1') return false;
  if (process.env.CI) return false;
  return Boolean(process.stdout.isTTY);
}

/**
 * LLM-style character streaming. ANSI color codes flash instantly;
 * visible characters trickle out with a slight pause after newlines.
 */
export async function typewrite(text, { cps = 220 } = {}) {
  if (!shouldTypewrite()) {
    process.stdout.write(text);
    return;
  }

  const delay = Math.max(2, Math.round(1000 / cps));
  for (const token of typeTokens(text)) {
    process.stdout.write(token);
    if (token.startsWith('\x1b')) continue;
    if (token === '\n') {
      await sleep(delay * 2);
    } else if (token === ' ') {
      await sleep(Math.max(1, Math.floor(delay / 2)));
    } else {
      await sleep(delay);
    }
  }
}

export async function typeLines(lines, opts) {
  await typewrite(`${lines.join('\n')}\n`, opts);
}

export function printDenied() {
  console.error(c.red('make: *** Permission denied.') + c.dim(' (Hint: you know what to do.)'));
}

/** Punchlines for the cold open — rotate so re-runs feel fresh. */
export const COLD_OPEN_PUNCHLINES = [
  'Okay. Privileges accepted. Finding lunch…',
  'root access: sandwich',
  'make: recipe found in /dev/stomach',
  'Elevated. Querying nearby carbohydrates…',
  'Permission granted. Assembling lunch kernel…',
  'uid=0(root) gid=0(sandwich) groups=0(hungry)',
  'CAP_SYS_LUNCH acquired. Scanning menus…',
  'sudo: sandwich authentication successful',
];

const SMUG_DOUBLE_SUDO =
  'Double sudo detected. Sandwich priority elevated to realtime.';

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/** Cold open — first thing you see when sudo actually works. */
export async function printColdOpen({ sudoSudo = false } = {}) {
  const line = `${c.dim('$')} ${c.bold('sudo make me a sandwich!')}`;
  const punch = c.green(pickRandom(COLD_OPEN_PUNCHLINES));
  console.log();
  if (sudoSudo) {
    await typewrite(`${line}\n${punch}\n${c.magenta(SMUG_DOUBLE_SUDO)}\n`, {
      cps: 180,
    });
  } else {
    await typewrite(`${line}\n${punch}\n`, { cps: 180 });
  }
}

export async function printOptions(options, { source, address } = {}) {
  const lines = [];
  lines.push('');
  lines.push(c.bold(c.green('🥪  Sandwich acquired. Here are your options:')));

  if (source === 'demo') {
    lines.push(c.dim('(demo data — DoorDash CLI is in beta; live results need CLI + login)'));
    if (address) {
      lines.push(c.dim(`Delivering to Best Buy HQ · ${address}`));
    }
  } else if (source === 'live') {
    lines.push(
      c.dim(
        `(live DoorDash results${address ? ` near ${address}` : ''})`
      )
    );
  }
  lines.push('');

  const cols = [
    { key: 'idx', label: '#', width: 3 },
    { key: 'name', label: 'Shop', width: 28 },
    { key: 'item', label: 'Sandwich', width: 24 },
    { key: 'price', label: 'Price', width: 8 },
    { key: 'eta', label: 'ETA', width: 10 },
    { key: 'distance', label: 'Dist', width: 8 },
  ];

  lines.push(cols.map((col) => c.bold(pad(col.label, col.width))).join('  '));
  lines.push(c.dim(cols.map((col) => '─'.repeat(col.width)).join('  ')));

  for (const [i, opt] of options.entries()) {
    const featured = Boolean(opt.personalized);
    const row = {
      idx: String(i + 1),
      name: opt.name ?? '—',
      item: opt.item ?? 'Sandwich',
      price: opt.price ?? '—',
      eta: opt.eta ?? '—',
      distance: opt.distance ?? '—',
    };
    const cells = cols.map((col) => {
      const padded = padVisible(row[col.key], col.width);
      if (featured && col.key === 'item') return c.bold(c.magenta(padded));
      return padded;
    });
    lines.push(cells.join('  '));
    if (opt.url) {
      lines.push(c.dim(`    → ${opt.url}`));
    }
  }

  lines.push('');
  if (source === 'live') {
    lines.push(c.bold('How to order'));
    lines.push(
      c.dim('  Open a link above, or use your DoorDash CLI to add items and check out.')
    );
    lines.push(c.dim('  This tool surfaces options — checkout stays in DoorDash.'));
    lines.push('');
  } else {
    lines.push(c.bold('Demo checkout'));
    lines.push(c.dim('  Pick a number to read the description, then Y to order (or b to go back).'));
    lines.push(c.dim('  Your named sandwich is highlighted.'));
    lines.push(
      c.dim('  DoorDash CLI is currently in beta — this demo does not place a real order.')
    );
    lines.push(c.dim('  For live search setup: ') + c.cyan('sudo-sandwich -h'));
    lines.push('');
  }

  await typeLines(lines, { cps: 320 });
}

export function printHelp() {
  console.log(`
${c.bold('sudo-sandwich')} — sudo make me a sandwich (xkcd #149, but with DoorDash)

${c.bold('Usage')}
  npx sudo-sandwich [options]
  npx sudo-sandwich init          Print shell wrappers for the literal phrase

${c.bold('Options')}
  --granted, -g     Skip the refusal gag; show sandwich options
  --denied, -d      Show the permission-denied gag
  --pick <n>        Demo mode: open option n (describe → confirm → deliver)
  --address <addr>  Delivery address (default: Best Buy HQ, Richfield MN)
  --quiet, -q       No terminal bell on delivery (or set SUDO_SANDWICH_QUIET=1)
  --sudo-sudo       Double-sudo easter egg (smug cold open / sign-off)
  --help, -h        Show this help (including live CLI login)

${c.bold('Faithful phrase')}
  npx sudo-sandwich init >> ~/.zshrc
  # then: sudo make me a sandwich!
  # or:   sudo sudo make me a sandwich!   ${c.dim('# --sudo-sudo easter egg')}

${c.bold('After demo delivery')}
  Tip the dasher (TTY), then get a shareable ASCII receipt.
  Non-interactive ${c.cyan('--pick')} skips the tip prompt (defaults to 20%).

${c.bold('Live DoorDash CLI')} ${c.dim('(beta)')}
  Official ${c.cyan('dd-cli')} is a limited DoorDash beta (US/Canada macOS, waitlist).
  Until that lands on your PATH + you're logged in, sudo-sandwich uses demo data.

  ${c.bold('Option A — official dd-cli (beta waitlist)')}
    1. Join DoorDash's CLI waitlist (announced via DoorDash / Andy Fang).
    2. Install with their beta instructions once accepted.
    3. Log in (exact command from their docs; typically something like):
         ${c.cyan('dd-cli auth login')}   ${c.dim('# or: dd-cli login')}
         ${c.cyan('dd-cli auth status')}
    4. Re-run ${c.cyan('npx sudo-sandwich')} — live sandwich search if auth succeeds.

  ${c.bold('Option B — community doordash-cli')} ${c.dim('(unofficial, cart-safe)')}
    1. ${c.cyan('npm install -g doordash-cli')}
    2. ${c.cyan('doordash-cli login')}      ${c.dim('# browser / reuse Chrome session')}
    3. ${c.cyan('doordash-cli auth-check')}
    4. ${c.cyan('doordash-cli set-address --address "7601 Penn Ave S, Richfield, MN 55423"')}
    5. Re-run ${c.cyan('npx sudo-sandwich')}

  ${c.dim('sudo-sandwich never asks for DoorDash passwords — auth stays in the DoorDash CLI.')}
  ${c.dim('Checkout/payment is out of scope here; live mode only upgrades search results.')}
`);
}
