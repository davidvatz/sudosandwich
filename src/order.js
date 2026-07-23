import { DEMO_SANDWICHES } from './data/sandwiches.js';
import { tryLiveSearch } from './providers/doordash.js';

/**
 * Hybrid sandwich sourcing: live DoorDash CLI search when available + authed,
 * otherwise curated demo list.
 */
export async function getSandwichOptions({ address, query = 'sandwich' } = {}) {
  const live = await tryLiveSearch({ query, address });
  if (live) {
    return {
      source: 'live',
      provider: live.provider,
      address: address || null,
      options: live.options,
    };
  }

  return {
    source: 'demo',
    provider: null,
    address: address || null,
    options: DEMO_SANDWICHES,
  };
}
