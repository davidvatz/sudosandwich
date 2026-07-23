import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import { delimiter, join } from 'node:path';

const SEARCH_TIMEOUT_MS = 15_000;
const AUTH_TIMEOUT_MS = 8_000;

async function which(cmd) {
  const dirs = (process.env.PATH || '').split(delimiter).filter(Boolean);
  for (const dir of dirs) {
    const full = join(dir, cmd);
    try {
      await access(full, fsConstants.X_OK);
      return full;
    } catch {
      // try next
    }
  }
  return null;
}

function run(cmd, args, { timeoutMs = SEARCH_TIMEOUT_MS } = {}) {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;

    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill('SIGTERM');
      resolve({ ok: false, error: 'timeout', stdout, stderr, code: null });
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: false, error: err.message, stdout, stderr, code: null });
    });

    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ ok: code === 0, error: code === 0 ? null : `exit ${code}`, stdout, stderr, code });
    });
  });
}

function tryParseJson(text) {
  const trimmed = (text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some CLIs mix logs with JSON — try last {...} or [...] block
    const startObj = trimmed.lastIndexOf('{');
    const startArr = trimmed.lastIndexOf('[');
    const start = Math.max(startObj, startArr);
    if (start < 0) return null;
    try {
      return JSON.parse(trimmed.slice(start));
    } catch {
      return null;
    }
  }
}

function asArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.stores)) return data.stores;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function formatPrice(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value.startsWith('$') ? value : `$${value}`;
  if (typeof value === 'number') {
    // Heuristic: cents vs dollars
    const dollars = value > 1000 ? value / 100 : value;
    return `$${dollars.toFixed(2)}`;
  }
  if (typeof value === 'object' && value.amount != null) {
    return formatPrice(value.amount);
  }
  return String(value);
}

function formatEta(row) {
  return (
    row.eta ||
    row.delivery_time ||
    row.deliveryTime ||
    row.asap_minutes ||
    (row.eta_minutes != null ? `${row.eta_minutes} min` : null) ||
    (row.delivery_duration != null ? `${row.delivery_duration} min` : null) ||
    '—'
  );
}

function formatDistance(row) {
  if (row.distance != null) {
    return typeof row.distance === 'number' ? `${row.distance.toFixed(1)} mi` : String(row.distance);
  }
  if (row.distance_miles != null) return `${Number(row.distance_miles).toFixed(1)} mi`;
  return '—';
}

function normalizeRow(row) {
  const name =
    row.name ||
    row.store_name ||
    row.storeName ||
    row.restaurant_name ||
    row.restaurantName ||
    row.title ||
    'Unknown shop';

  const item =
    row.item ||
    row.item_name ||
    row.itemName ||
    row.menu_item ||
    row.description ||
    row.cuisine ||
    'Sandwich';

  const price = formatPrice(
    row.price ?? row.display_price ?? row.displayPrice ?? row.cost ?? row.amount
  );

  const storeId = row.store_id || row.storeId || row.id || row.restaurant_id;
  const url =
    row.url ||
    row.link ||
    (storeId
      ? `https://www.doordash.com/store/${encodeURIComponent(String(storeId))}`
      : `https://www.doordash.com/search/store/${encodeURIComponent(name)}`);

  return {
    name: String(name),
    item: String(item),
    price,
    eta: String(formatEta(row)),
    distance: String(formatDistance(row)),
    url,
  };
}

const PROVIDERS = [
  {
    id: 'dd-cli',
    binary: 'dd-cli',
    async isAuthed(bin) {
      const result = await run(bin, ['auth', 'status', '--json'], { timeoutMs: AUTH_TIMEOUT_MS });
      if (result.ok) return true;
      // Some builds may not support --json
      const fallback = await run(bin, ['auth', 'status'], { timeoutMs: AUTH_TIMEOUT_MS });
      if (!fallback.ok) return false;
      const text = `${fallback.stdout}\n${fallback.stderr}`.toLowerCase();
      if (text.includes('not logged') || text.includes('unauth') || text.includes('no auth')) {
        return false;
      }
      return true;
    },
    async search(bin, { query, address }) {
      const args = ['search', '--query', query, '--json'];
      if (address) args.push('--address', address);
      const result = await run(bin, args, { timeoutMs: SEARCH_TIMEOUT_MS });
      if (!result.ok) return { ok: false, error: result.error || result.stderr };
      const data = tryParseJson(result.stdout);
      const rows = asArray(data).map(normalizeRow).filter((r) => r.name !== 'Unknown shop' || r.item !== 'Sandwich');
      if (!rows.length) return { ok: false, error: 'empty results' };
      return { ok: true, options: rows.slice(0, 5) };
    },
  },
  {
    id: 'doordash-cli',
    binary: 'doordash-cli',
    async isAuthed(bin) {
      const result = await run(bin, ['auth-check', '--json'], { timeoutMs: AUTH_TIMEOUT_MS });
      if (result.ok) return true;
      const fallback = await run(bin, ['auth-check'], { timeoutMs: AUTH_TIMEOUT_MS });
      return fallback.ok;
    },
    async search(bin, { query, address }) {
      const args = ['search', '--query', query, '--json'];
      if (address) {
        // Unofficial CLI uses set-address separately; best-effort pass-through
        await run(bin, ['set-address', '--address', address], { timeoutMs: AUTH_TIMEOUT_MS });
      }
      const result = await run(bin, args, { timeoutMs: SEARCH_TIMEOUT_MS });
      if (!result.ok) return { ok: false, error: result.error || result.stderr };
      const data = tryParseJson(result.stdout);
      const rows = asArray(data).map(normalizeRow);
      if (!rows.length) return { ok: false, error: 'empty results' };
      return { ok: true, options: rows.slice(0, 5) };
    },
  },
];

/**
 * Try official then unofficial DoorDash CLIs. Returns null on any failure
 * so the caller can fall back to demo data.
 */
export async function tryLiveSearch({ query = 'sandwich', address } = {}) {
  for (const provider of PROVIDERS) {
    const bin = await which(provider.binary);
    if (!bin) continue;

    try {
      const authed = await provider.isAuthed(bin);
      if (!authed) continue;

      const result = await provider.search(bin, { query, address });
      if (result.ok && result.options?.length) {
        return {
          source: 'live',
          provider: provider.id,
          options: result.options,
        };
      }
    } catch {
      // Graceful: try next provider / fall through to demo
    }
  }
  return null;
}
