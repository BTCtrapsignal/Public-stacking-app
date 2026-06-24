/**
 * validators.js — Runtime entry validation + numeric sanitization.
 * Pure functions. No side effects. No UI imports.
 *
 * Goals:
 *  1. Sanitize numeric fields — reject NaN, Infinity, non-finite values
 *  2. Validate required fields per entry type
 *  3. Provide safe fallbacks so metrics never receive garbage
 *  4. Sanitize imported arrays from backup/restore
 */

// ── Numeric helpers ───────────────────────────────────────────────────────────

/**
 * Convert any value to a finite number.
 * Returns `fallback` (default 0) for NaN, Infinity, null, undefined, ''.
 */
export function safeNum(val, fallback = 0) {
  const n = Number(val)
  return Number.isFinite(n) ? n : fallback
}

/**
 * safeNum but clamps to >= 0. Use for quantities/prices that can't be negative.
 */
export function safePos(val, fallback = 0) {
  return Math.max(0, safeNum(val, fallback))
}

/**
 * Clamp a number within [min, max]. Returns fallback if not finite.
 */
export function clamp(val, min, max, fallback = 0) {
  const n = safeNum(val, fallback)
  return Math.min(max, Math.max(min, n))
}

/**
 * Safe date string: ensure value is a non-empty string that looks like a date.
 * Falls back to today's ISO date string.
 */
function safeDate(val) {
  if (typeof val === 'string' && val.length >= 8) return val
  return new Date().toISOString().slice(0, 10)
}

/**
 * Safe string: ensure value is a string, trim it, apply max length.
 */
function safeStr(val, maxLen = 200, fallback = '') {
  if (typeof val !== 'string') return fallback
  return val.trim().slice(0, maxLen) || fallback
}

// ── _id passthrough ──────────────────────────────────────────────────────────

/** Preserve existing _id or leave undefined (will be stamped by addEntry). */
function keepId(raw, out) {
  if (raw && typeof raw._id === 'string' && raw._id.length > 0) out._id = raw._id
  return out
}

// ── Per-type entry sanitizers ─────────────────────────────────────────────────

/**
 * Sanitize a DCA or Dip entry.
 * btcQty CAN be negative (transfer-out). usdtAmount is absolute spend.
 */
export function sanitizeDcaEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const btcQty = safeNum(raw.btcQty, null)
  if (btcQty === null) {
    console.warn('[validators] DCA entry rejected: invalid btcQty', raw)
    return null
  }
  return keepId(raw, {
    date:        safeDate(raw.date),
    type:        safeStr(raw.type, 10, 'BUY'),
    source:      safeStr(raw.source, 100, ''),
    btcQty,
    usdtAmount:  safeNum(raw.usdtAmount, 0),
    thbAmount:   safePos(raw.thbAmount, 0),
    price:       safePos(raw.price, 0),
    note:        safeStr(raw.note, 300, ''),
    location:    safeStr(raw.location, 100, ''),
    strategy:    safeStr(raw.strategy, 50, 'DCA'),
  })
}

// Dip entries share the same shape as DCA
export function sanitizeDipEntry(raw) {
  const entry = sanitizeDcaEntry(raw)
  if (!entry) return null
  return { ...entry, strategy: safeStr(raw?.strategy, 50, 'Dip Reserve') }
}

/**
 * Sanitize a Futures entry.
 * pnlUsdt can be negative (loss). sizeBtc must be >= 0.
 */
export function sanitizeFuturesEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const pnlUsdt = safeNum(raw.pnlUsdt, null)
  if (pnlUsdt === null) {
    console.warn('[validators] Futures entry rejected: invalid pnlUsdt', raw)
    return null
  }
  return keepId(raw, {
    dateOpen:   safeDate(raw.dateOpen),
    dateClose:  safeDate(raw.dateClose),
    symbol:     safeStr(raw.symbol, 20, 'BTCUSDT'),
    side:       ['Long', 'Short'].includes(raw.side) ? raw.side : 'Long',
    leverage:   safeStr(raw.leverage, 10, '3x'),
    mode:       ['Cross', 'Isolated'].includes(raw.mode) ? raw.mode : 'Cross',
    entryPrice: safePos(raw.entryPrice, 0),
    exitPrice:  safePos(raw.exitPrice, 0),
    sizeBtc:    safePos(raw.sizeBtc, 0),
    pnlUsdt,
    mistakeTag: safeStr(raw.mistakeTag, 200, null) || null,
    notes:      safeStr(raw.notes, 500, null) || null,
    strategy:   safeStr(raw.strategy, 50, 'Futures'),
  })
}

/**
 * Sanitize a Grid Bot entry.
 * netProfitUsdt can be negative.
 */
export function sanitizeGridEntry(raw) {
  if (!raw || typeof raw !== 'object') return null
  const netProfitUsdt = safeNum(raw.netProfitUsdt, null)
  if (netProfitUsdt === null) {
    console.warn('[validators] Grid entry rejected: invalid netProfitUsdt', raw)
    return null
  }
  return keepId(raw, {
    dateStart:     safeDate(raw.dateStart),
    dateEnd:       safeDate(raw.dateEnd),
    gridType:      safeStr(raw.gridType, 20, 'Spot'),
    mode:          safeStr(raw.mode, 20, 'Arithmetic'),
    capitalUsdt:   safePos(raw.capitalUsdt, 0),
    netProfitUsdt,
    roi:           safeNum(raw.roi, 0),
    note:          safeStr(raw.note, 300, ''),
    strategy:      safeStr(raw.strategy, 50, 'Grid Bot'),
  })
}

// ── Array sanitizer ───────────────────────────────────────────────────────────

const SANITIZERS = {
  dca:     sanitizeDcaEntry,
  dip:     sanitizeDipEntry,
  futures: sanitizeFuturesEntry,
  grid:    sanitizeGridEntry,
}

/**
 * Sanitize an entire array of entries for a given type.
 * Drops any entry that fails validation (returns null).
 * Always returns an array (empty if input is not an array).
 */
export function sanitizeEntries(type, arr) {
  if (!Array.isArray(arr)) return []
  const fn = SANITIZERS[type]
  if (!fn) return arr // unknown type — pass through untouched
  const out = []
  for (const item of arr) {
    const clean = fn(item)
    if (clean !== null) out.push(clean)
  }
  if (out.length !== arr.length) {
    console.warn(
      `[validators] sanitizeEntries(${type}): dropped ${arr.length - out.length} invalid entries`
    )
  }
  return out
}

// ── NaN guard for metrics input ───────────────────────────────────────────────

/**
 * Guard all numeric fields in a metrics-input entry against NaN/Infinity.
 * Non-destructive: returns a new object. Used as a last-resort firewall before
 * feeding entries into computeMetrics() reduces.
 */
export function guardEntry(entry) {
  if (!entry || typeof entry !== 'object') return {}
  const out = { ...entry }
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'number' && !Number.isFinite(v)) {
      out[k] = 0
    }
  }
  return out
}
