# sudo-sandwich

> GPT3, sudo make me a sandwich!

[xkcd #149](https://xkcd.com/149/) meets DoorDash's `dd-cli`. A zero-config CLI that refuses to make you a sandwich — until you ask properly — then returns options of where to order one.

Created by [David Vatz](https://www.linkedin.com/in/davidvatz) from Cursor.

## Quick start

```bash
npx sudo-sandwich
```

You'll get a short `Flibbertigibbeting...` moment (cold-open punchline rotates each run), then the sandwich board streams in character-by-character (LLM-style). In demo mode, pick a number to read the description, confirm with `Y` to fake-checkout, and watch a pithy delivery timeline (≤12s). After delivery: tip the dasher gag (TTY), a shareable ASCII receipt, and a terminal bell (unless quiet).

Skip the typewriter effect: `SUDO_SANDWICH_NO_TYPE=1 npx sudo-sandwich`  
Silence the delivery bell: `--quiet` / `-q` or `SUDO_SANDWICH_QUIET=1`

### The refusal gag

```bash
npx sudo-sandwich --denied
# make: *** Permission denied. (Hint: you know what to do.)
```

### With real sudo

```bash
sudo npx sudo-sandwich
# or
npx sudo-sandwich --granted
```

## Faithful phrase: `sudo make me a sandwich!`

Opt in to shell wrappers so the literal xkcd line works, while every other `make` / `sudo` call passes through unchanged:

```bash
npx sudo-sandwich init >> ~/.zshrc
source ~/.zshrc
```

Then:

```bash
make me a sandwich!
# make: *** Permission denied. (Hint: you know what to do.)

sudo make me a sandwich!
# 🥪 Sandwich acquired...

sudo sudo make me a sandwich!
# Double sudo detected. Sandwich priority elevated to realtime.
```

### Undo

1. Remove the `# >>> sudo-sandwich >>>` … `# <<< sudo-sandwich <<<` block from `~/.zshrc` (or `~/.bashrc`).
2. In the current shell: `unfunction make sudo` (zsh) or `unset -f make sudo` (bash).

## Live DoorDash vs demo data

DoorDash's official CLI (`dd-cli`) is **currently in beta** (waitlist). Hybrid by design:

1. If [`dd-cli`](https://techcrunch.com/2026/07/16/yes-you-can-now-order-doordash-from-the-command-line/) (official beta) or [`doordash-cli`](https://github.com/LatencyTDH/doordash-cli) is on your `PATH` **and** you're authenticated, results come from a live sandwich search.
2. Otherwise you get a curated demo board, clearly labeled (demo checkout is fake).

Full login steps: `npx sudo-sandwich -h`

Default delivery pin is **Best Buy HQ** — `7601 Penn Ave S, Richfield, MN 55423`. Override with:

```bash
npx sudo-sandwich --granted --address "350 5th Ave, New York, NY 10118"
# or
export SUDO_SANDWICH_ADDRESS="…"
```

Checkout stays in DoorDash — this CLI only surfaces options.

## Options

| Flag | Meaning |
| --- | --- |
| `--granted`, `-g` | Skip the refusal gag; show options |
| `--denied`, `-d` | Show the permission-denied gag |
| `--pick <n>`, `-p` | Demo mode: select option `n` and run the delivery timeline (non-interactive) |
| `--address <addr>` | Address for live DoorDash search |
| `--quiet`, `-q` | No terminal bell on delivery (`SUDO_SANDWICH_QUIET=1` also works) |
| `--sudo-sudo` | Double-sudo easter egg (smug cold open / sign-off) |
| `--help`, `-h` | Help |
| `init` | Print the shell wrapper snippet |

Demo delivery without the prompt (auto tip 20%, still prints receipt; no tip hang):

```bash
node bin/cli.js --pick 1 --quiet
```

Double-sudo easter egg without the shell wrapper:

```bash
npx sudo-sandwich --granted --sudo-sudo
```

Strict xkcd mode (refuse unless elevated / `--granted`):

```bash
SUDO_SANDWICH_REQUIRE_SUDO=1 npx sudo-sandwich
```

## Install (optional)

```bash
npm install -g sudo-sandwich
sudo-sandwich --granted
```

Requires Node.js 18+. Zero runtime dependencies.

## License

MIT
