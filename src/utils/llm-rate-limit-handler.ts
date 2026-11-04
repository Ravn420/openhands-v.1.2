/**
 * LLM Rate Limit Handler + Venice.ai Account Rotation
 *
 * Provides two complementary mechanisms for keeping LLM completions running
 * 24-7 even under tight provider rate limits:
 *
 * 1. Per-provider rate-limit tracking with exponential backoff.
 * 2. Venice.ai account rotation — when one API key/account is rate-limited,
 *    automatically cycle to the next available account.
 */

// Base delay for exponential backoff (ms).
const BASE_BACKOFF_MS = 1_000;

// Maximum backoff delay (ms) — cap at ~5 minutes.
const MAX_BACKOFF_MS = 300_000;

// How long to remember a rate limit before an account is eligible again (ms).
const ACCOUNT_COOLDOWN_MS = 5 * 60_000; // 5 minutes default

// Maximum number of rotation attempts before giving up.
const MAX_ROTATION_ATTEMPTS = 20;

/**
 * A tracked Venice.ai account. Multiple accounts can be registered so that
 * when one hits a rate limit, the client automatically rotates to the next.
 */
export interface VeniceAccount {
  /** Unique label for the account (e.g. "venice-free-1"). */
  label: string;
  /** The API key for this account. */
  apiKey: string;
  /** Whether this account is currently enabled for rotation. */
  enabled: boolean;
  /** Unix timestamp (ms) when this account was last rate-limited. */
  limitedAt: number | null;
  /** Retry-After delay from the provider, if any (ms). */
  retryAfterMs: number | null;
  /** Number of consecutive rate-limit hits on this account. */
  hitCount: number;
}

/** Per-provider rate limit state for generic (non-Venice) providers. */
interface RateLimitState {
  limitedAt: number;
  retryAfterMs: number | null;
  attempt: number;
}

const rateLimitStates = new Map<string, RateLimitState>();

/** Registered Venice.ai accounts, in rotation order. */
const veniceAccounts: VeniceAccount[] = [];

/** Index of the next account to try in the rotation. */
let veniceRotationIndex = 0;

/** Persisted storage key for Venice.ai account list. */
const VENICE_STORAGE_KEY = "oh.llm.venice.accounts";

/** Persisted storage key for whether auto-rotation is enabled. */
const VENICE_ROTATION_ENABLED_KEY = "oh.llm.venice.rotationEnabled";

/**
 * Extract a Retry-After delay (ms) from a fetch Response.
 */
function extractRetryAfterMs(response: Response): number | null {
  const header = response.headers.get("Retry-After");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1_000;
  }
  return null;
}

/**
 * Determine whether an HTTP response indicates a rate limit.
 */
function isRateLimited(response: Response): boolean {
  return (
    response.status === 429 ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504
  );
}

/**
 * Compute exponential backoff with jitter.
 */
function computeBackoffMs(
  attempt: number,
  retryAfterMs: number | null,
): number {
  if (retryAfterMs && retryAfterMs > 0) {
    return Math.min(retryAfterMs, MAX_BACKOFF_MS);
  }
  const exponential = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
  const clamped = Math.min(exponential, MAX_BACKOFF_MS);
  const jitter = clamped * 0.25 * (Math.random() * 2 - 1);
  return Math.max(clamped + jitter, BASE_BACKOFF_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================================================================
 * Generic per-provider rate limiting
 * ========================================================================= */

/**
 * Record that a provider was rate-limited.
 */
export function recordRateLimit(
  providerId: string,
  response: Response | null = null,
): void {
  const retryAfterMs = response ? extractRetryAfterMs(response) : null;
  rateLimitStates.set(providerId, {
    limitedAt: Date.now(),
    retryAfterMs,
    attempt: 1,
  });
}

/**
 * Check whether a provider is currently rate-limited.
 */
export function getRateLimitStatus(
  providerId: string,
): { limited: boolean; retryAfterMs: number | null; attempt: number } | null {
  const state = rateLimitStates.get(providerId);
  if (!state) return null;

  const now = Date.now();
  const backoffMs = computeBackoffMs(state.attempt, state.retryAfterMs);
  const readyAt = state.limitedAt + backoffMs;

  if (now >= readyAt) {
    rateLimitStates.delete(providerId);
    return null;
  }

  return {
    limited: true,
    retryAfterMs: Math.max(readyAt - now, 0),
    attempt: state.attempt,
  };
}

/* =========================================================================
 * Venice.ai account rotation
 * ========================================================================= */

/**
 * Load persisted Venice.ai accounts from localStorage.
 */
function loadVeniceAccounts(): VeniceAccount[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(VENICE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as VeniceAccount[];
  } catch {
    // Ignore storage errors.
  }
  return [];
}

/** Persist the current account list to localStorage. */
function persistVeniceAccounts(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(VENICE_STORAGE_KEY, JSON.stringify(veniceAccounts));
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Initialize the account rotation system from persisted state.
 */
export function initVeniceAccountRotation(): void {
  const stored = loadVeniceAccounts();
  veniceAccounts.length = 0;
  veniceAccounts.push(...stored);
  veniceRotationIndex = 0;
}

/**
 * Whether automatic account rotation is enabled.
 */
export function isVeniceAutoRotationEnabled(): boolean {
  if (typeof localStorage === "undefined") return true;
  try {
    const raw = localStorage.getItem(VENICE_ROTATION_ENABLED_KEY);
    return raw !== "false"; // default enabled
  } catch {
    return true;
  }
}

export function setVeniceAutoRotationEnabled(enabled: boolean): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(VENICE_ROTATION_ENABLED_KEY, String(enabled));
  } catch {
    // Ignore storage errors.
  }
}

/**
 * Register a new Venice.ai account for rotation.
 */
export function addVeniceAccount(
  account: Omit<VeniceAccount, "limitedAt" | "retryAfterMs" | "hitCount">,
): void {
  const entry: VeniceAccount = {
    ...account,
    limitedAt: null,
    retryAfterMs: null,
    hitCount: 0,
  };
  veniceAccounts.push(entry);
  persistVeniceAccounts();
}

/**
 * Remove a Venice.ai account by label.
 */
export function removeVeniceAccount(label: string): void {
  const idx = veniceAccounts.findIndex((a) => a.label === label);
  if (idx >= 0) {
    veniceAccounts.splice(idx, 1);
    if (veniceRotationIndex >= veniceAccounts.length) {
      veniceRotationIndex = 0;
    }
    persistVeniceAccounts();
  }
}

/**
 * Update an existing account's enabled state.
 */
export function setVeniceAccountEnabled(label: string, enabled: boolean): void {
  const acc = veniceAccounts.find((a) => a.label === label);
  if (acc) {
    acc.enabled = enabled;
    persistVeniceAccounts();
  }
}

/**
 * Return all registered Venice.ai accounts.
 */
export function getVeniceAccounts(): readonly VeniceAccount[] {
  return veniceAccounts;
}

/**
 * Return the count of enabled, non-rate-limited accounts available for use.
 */
export function getAvailableVeniceAccountCount(): number {
  const now = Date.now();
  return veniceAccounts.filter((a) => {
    if (!a.enabled) return false;
    if (a.limitedAt) {
      const cooldown = a.retryAfterMs ?? ACCOUNT_COOLDOWN_MS;
      if (now - a.limitedAt < cooldown) return false;
    }
    return true;
  }).length;
}

/**
 * Select the next available Venice.ai account in rotation, marking the
 * previous one as rate-limited if `previousLabel` is provided.
 *
 * Returns the account to use, or `null` if no account is available.
 */
export function selectNextVeniceAccount(
  previousLabel: string | null = null,
): VeniceAccount | null {
  if (veniceAccounts.length === 0) return null;

  // If we have a previous account that was just rate-limited, record it.
  if (previousLabel) {
    const acc = veniceAccounts.find((a) => a.label === previousLabel);
    if (acc) {
      acc.limitedAt = Date.now();
      acc.hitCount += 1;
      acc.retryAfterMs = null;
    }
  }

  const now = Date.now();

  // Try up to MAX_ROTATION_ATTEMPTS accounts to find an available one.
  for (
    let i = 0;
    i < Math.min(veniceAccounts.length, MAX_ROTATION_ATTEMPTS);
    i += 1
  ) {
    const acc = veniceAccounts[veniceRotationIndex];
    veniceRotationIndex = (veniceRotationIndex + 1) % veniceAccounts.length;

    if (!acc.enabled) continue;

    if (acc.limitedAt) {
      const cooldown = acc.retryAfterMs ?? ACCOUNT_COOLDOWN_MS;
      if (now - acc.limitedAt < cooldown) continue; // still cooling down
      // Cooldown expired — clear the limit state.
      acc.limitedAt = null;
      acc.retryAfterMs = null;
    }

    return acc;
  }

  return null; // no account available
}

/**
 * Record that the current response was rate-limited for the given account,
 * and rotate to the next available account.
 *
 * Returns the next account to use, or `null` if none are available.
 */
export function recordVeniceRateLimitAndRotate(
  accountLabel: string,
  response: Response | null = null,
): VeniceAccount | null {
  const acc = veniceAccounts.find((a) => a.label === accountLabel);
  if (acc) {
    acc.limitedAt = Date.now();
    acc.hitCount += 1;
    acc.retryAfterMs = response
      ? (extractRetryAfterMs(response) ?? null)
      : null;
  }
  return selectNextVeniceAccount(accountLabel);
}

/**
 * Reset all Venice.ai account rate-limit states so they can be retried.
 */
export function resetVeniceAccountLimits(): void {
  for (const acc of veniceAccounts) {
    acc.limitedAt = null;
    acc.retryAfterMs = null;
    acc.hitCount = 0;
  }
}

/**
 * Execute a fetch-like function with Venice.ai account rotation.
 *
 * On each attempt, selects the next available account. If the response is
 * rate-limited, records it and rotates to the next account. Continues until
 * success or all accounts are exhausted.
 *
 * `fn` receives the account to use and should return a Response.
 *
 * Returns the final successful Response, or throws if no account is
 * available or all accounts are rate-limited.
 */
export async function withVeniceAccountRotation(
  fn: (account: VeniceAccount) => Promise<Response>,
): Promise<Response> {
  const startTime = Date.now();
  const maxTotalTimeMs = 10 * 60_000; // 10 minutes max

  let lastError: unknown = null;
  let currentAccount = selectNextVeniceAccount();

  while (currentAccount) {
    const account = currentAccount;

    // Check if we've spent too much time rotating.
    if (Date.now() - startTime > maxTotalTimeMs) {
      break;
    }

    try {
      const response = await fn(account);

      if (!isRateLimited(response)) {
        // Success — clear this account's limit state.
        const acc = veniceAccounts.find((a) => a.label === account.label);
        if (acc) {
          acc.limitedAt = null;
          acc.retryAfterMs = null;
          acc.hitCount = 0;
        }
        return response;
      }

      // Rate-limited — rotate to the next account.
      lastError = response;
      currentAccount = recordVeniceRateLimitAndRotate(account.label, response);
    } catch (err) {
      // Network error — rotate and retry if rotation is enabled.
      lastError = err;
      currentAccount = selectNextVeniceAccount(account.label);
      if (!isVeniceAutoRotationEnabled() || !currentAccount) {
        throw err;
      }
      await sleep(500); // brief pause before rotating on network error
    }
  }

  // No accounts available — throw.
  throw new Error(
    `All Venice.ai accounts are rate-limited or unavailable. Last error: ${String(lastError)}`,
  );
}
