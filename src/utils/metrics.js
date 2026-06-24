/**
 * Business logic — metrics, projection math, dip calculator.
 * Pure functions: no side effects, no UI imports.
 */
import { guardEntry } from './validators'

// ── Portfolio Metrics ─────────────────────────────────

export function computeMetrics({ dca, dip, futures, grid, settings }) {
  const price  = +settings.currentPrice || 0
  const usdthb = +settings.usdthb || 33

  // Guard all entries against NaN/Infinity fields before reduction
  const safeDca     = dca.map(guardEntry)
  const safeDip     = dip.map(guardEntry)
  const safeFutures = futures.map(guardEntry)
  const safeGrid    = grid.map(guardEntry)

  // Only count positive BTC qty for holdings (exclude transfer-out fees from cost basis)
  const dcaBtc  = safeDca.reduce((s, x) => s + (+x.btcQty || 0), 0)
  const dipBtc  = safeDip.reduce((s, x) => s + (+x.btcQty || 0), 0)
  const totalBtc = dcaBtc + dipBtc

  // Cost basis: only entries where money was actually spent (usdtAmount > 0)
  const dcaInv  = safeDca.reduce((s, x) => s + (x.btcQty > 0 ? Math.abs(+x.usdtAmount || 0) : 0), 0)
  const dipInv  = safeDip.reduce((s, x) => s + (x.btcQty > 0 ? Math.abs(+x.usdtAmount || 0) : 0), 0)
  const totalInv = dcaInv + dipInv

  // Actual THB invested — use thbAmount if recorded, else fallback to usdtAmount × live rate
  const dcaInvThb  = safeDca.reduce((s, x) => s + (x.btcQty > 0
    ? (x.thbAmount > 0 ? x.thbAmount : Math.abs(+x.usdtAmount || 0) * usdthb) : 0), 0)
  const dipInvThb  = safeDip.reduce((s, x) => s + (x.btcQty > 0
    ? (x.thbAmount > 0 ? x.thbAmount : Math.abs(+x.usdtAmount || 0) * usdthb) : 0), 0)
  const totalInvThb = dcaInvThb + dipInvThb

  // Avg cost per BTC (cost basis / total BTC held)
  const avgCost = totalBtc > 0 ? totalInv / totalBtc : 0

  // Unrealized PnL = current market value minus total cost basis
  const marketValue  = totalBtc * price
  const unrealPnlUsd = marketValue - totalInv
  // PnL % relative to cost basis (how much has investment grown)
  const unrealPnlPct = totalInv > 0 ? (unrealPnlUsd / totalInv) * 100 : 0

  const futPnl  = safeFutures.reduce((s, x) => s + (+x.pnlUsdt || 0), 0)
  const gridPnl = safeGrid.reduce((s, x) => s + (+x.netProfitUsdt || 0), 0)
  const wins    = safeFutures.filter(x => +x.pnlUsdt > 0).length
  const winRate = safeFutures.length ? (wins / safeFutures.length) * 100 : 0

  const mo    = new Date().toISOString().slice(0, 7)
  const moDca = safeDca.filter(x => String(x.date).slice(0, 7) === mo)
  const moBtc = moDca.reduce((s, x) => s + (+x.btcQty || 0), 0)
  const moInv = moDca.reduce((s, x) => s + (x.btcQty > 0 ? Math.abs(+x.usdtAmount || 0) : 0), 0)

  return {
    price, usdthb,
    dcaBtc, dipBtc, totalBtc,
    dcaInv, dipInv, totalInv, totalInvThb,
    avgCost,
    marketValue, unrealPnlUsd, unrealPnlPct,
    futPnl, gridPnl, wins, winRate,
    moCount: moDca.length, moBtc, moInv,
    futsToBtc:      price > 0 ? futPnl  / price : 0,
    gridToBtc:      price > 0 ? gridPnl / price : 0,
    totalConverted: price > 0 ? (futPnl + gridPnl) / price : 0,
  }
}

// ── DCA Projection ────────────────────────────────────

export function estimateProjection({ settings, dcaBtc }) {
  const cur  = +(settings.manualCurrentDcaBtc || dcaBtc)
  const tgt  = +(settings.goalBtc || 1)
  const age  = +(settings.currentAge || 29)
  const tAge = +(settings.targetAge  || 40)
  const dca  = +(settings.monthlyDcaUsd || 300)
  const gr   = +(settings.annualGrowthRate || 0) / 100
  const p0   = +(settings.currentPrice || 1)
  const mgr  = Math.pow(1 + gr, 1 / 12) - 1
  const months = Math.max(0, Math.round((tAge - age) * 12))

  let btc = cur, price = p0
  const path = [{ age, btc }]
  for (let i = 1; i <= months; i++) {
    btc   += dca / price
    price *= (1 + mgr)
    path.push({ age: age + i / 12, btc })
  }
  const estimatedBTCAtTargetAge = btc

  let b2 = cur, p2 = p0, mo2 = 0
  while (b2 < tgt && mo2 < 1200) { b2 += dca / p2; p2 *= (1 + mgr); mo2++ }
  const reachAge    = age + mo2 / 12
  const shortfall   = Math.max(0, tgt - btc)
  const requiredDca = solveRequiredDca({ cur, tgt, age, tAge, p0, gr })

  return {
    currentBtc: cur, targetBTC: tgt, currentAge: age, targetAge: tAge,
    currentPrice: p0, monthlyDcaUsd: dca, annualGrowthRate: gr,
    estimatedBTCAtTargetAge, shortfall, reachAge,
    onTrack: btc >= tgt, requiredDca, path,
    suggestions: buildSuggestions({ cur, tgt, age, tAge, p0, dca, gr }),
  }
}

function projectWith({ cur, tgt, age, tAge, p0, dca, gr }) {
  const mgr    = Math.pow(1 + gr, 1 / 12) - 1
  const months = Math.max(0, Math.round((tAge - age) * 12))
  let btc = cur, price = p0
  for (let i = 1; i <= months; i++) { btc += dca / price; price *= (1 + mgr) }
  let b2 = cur, p2 = p0, mo = 0
  while (b2 < tgt && mo < 1200) { b2 += dca / p2; p2 *= (1 + mgr); mo++ }
  return { projBtc: btc, reachAge: age + mo / 12, onTrack: btc >= tgt }
}

function solveRequiredDca({ cur, tgt, age, tAge, p0, gr }) {
  let lo = 0, hi = 100_000
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    projectWith({ cur, tgt, age, tAge, p0, dca: mid, gr }).projBtc >= tgt
      ? (hi = mid) : (lo = mid)
  }
  return hi
}

function buildSuggestions({ cur, tgt, age, tAge, p0, dca, gr }) {
  return [
    { extra: 100, growthAdj: gr,   icon: '💵', label: 'Add $100/month',   cls: 's1' },
    { extra: 300, growthAdj: gr,   icon: '💰', label: 'Add $300/month',   cls: 's2' },
    { extra: 0,   growthAdj: 0.15, icon: '📈', label: 'Growth at 15%/yr', cls: 's3' },
  ].map(({ extra, growthAdj, icon, label, cls }) => {
    const s    = projectWith({ cur, tgt, age, tAge, p0, dca: dca + extra, gr: growthAdj })
    const diff = s.reachAge - tAge
    return {
      icon, label, cls, reach: s.reachAge,
      isEarly: diff <= 0,
      diffLabel: Math.abs(diff) < 0.1
        ? 'On target 🎯'
        : diff < 0
          ? `${Math.abs(diff).toFixed(1)} yrs early`
          : `${diff.toFixed(1)} yrs late`,
    }
  })
}

// ── Buy The Dip Calculator ────────────────────────────

export function calcDipLayers({ totalBudgetUsd, usdthb, refPrice, layers }) {
  return layers.map(layer => {
    const usdAmount = (totalBudgetUsd * layer.pct) / 100
    const thbAmount = usdAmount * usdthb
    const buyPrice  = refPrice * (1 + layer.dropPct / 100)
    const btcEst    = buyPrice > 0 ? usdAmount / buyPrice : 0
    return { ...layer, usdAmount, thbAmount, buyPrice, btcEst }
  })
}

export function validateDipLayers(layers) {
  const sum = layers.reduce((s, l) => s + (Number(l.pct) || 0), 0)
  return { valid: Math.abs(sum - 100) < 0.001, sum }
}

// Backward-compatible export — satisfies FuturesPage import
export function calcFuturesRoi(entry) {
  const pnl      = Number(entry?.pnlUsdt)     || 0
  const entryPx  = Number(entry?.entryPrice)  || 0
  const size     = Number(entry?.sizeBtc)     || 0
  const lev      = Number(entry?.leverage)    || 1
  const margin   = entryPx * size / lev
  return margin > 0 ? (pnl / margin) * 100 : 0
}
