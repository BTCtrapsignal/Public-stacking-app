import { useMemo, useState } from 'react'
import { Card, CardHead }     from '../components/shared/Card'
import { EntryRow }           from '../components/shared/EntryRow'
import { ProgressBar }        from '../components/shared/ProgressBar'
import { PortfolioBreakdown } from '../components/home/PortfolioBreakdown'
import { PortfolioHistory }   from '../components/home/PortfolioHistory'
import { computeMetrics }     from '../utils/metrics'
import {
  fmtBtc, fmtUsdCompact, fmtThbCompact,
  fmtPct, fmtDate,
} from '../utils/format'

const $$ = (v, d = 2) => {
  const n = Math.abs(Number(v) || 0), s = Number(v) < 0 ? '-' : ''
  return `${s}$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

export function HomePage({ state, onEditGoal, onRefresh }) {
  const m          = useMemo(() => computeMetrics(state), [state])
  const { settings } = state
  const [refreshing, setRefreshing] = useState(false)

  const goalPct   = settings.goalBtc > 0
    ? Math.min(100, (m.totalBtc / settings.goalBtc) * 100)
    : 0
  const remaining = Math.max(0, settings.goalBtc - m.totalBtc)

  // Current market value (live — changes with price)
  const currentValueUsd = m.totalBtc * m.price
  const currentValueThb = currentValueUsd * m.usdthb

  // Unrealized PnL = market value − recorded cost basis
  const unrealPnlUsd = currentValueUsd - m.totalInv
  const unrealPnlThb = unrealPnlUsd * m.usdthb
  const unrealPnlPct = m.totalInv > 0 ? (unrealPnlUsd / m.totalInv) * 100 : 0
  const unrealPos    = unrealPnlUsd >= 0

  // THB sign prefix — matches USD sign
  const sign = unrealPos ? '+' : '-'
  const thbLine = `≈ ${sign}${fmtThbCompact(Math.abs(unrealPnlThb))}`

  // Avg cost + current price THB
  const avgCostThb   = m.avgCost * m.usdthb
  const curPriceThb  = m.price   * m.usdthb

  async function handleRefresh() {
    if (typeof onRefresh !== 'function') return
    setRefreshing(true)
    try { await onRefresh() } finally { setRefreshing(false) }
  }

  const recentRows = useMemo(() => [
    ...state.dca.slice(0, 3).map(x => ({
      kind: 'dca', badge: 'DCA',
      title:    fmtDate(x.date),
      sub:      (x.note || x.source || '').replace(/, 1m candle/g, '').slice(0, 38),
      val:      `${x.btcQty >= 0 ? '+' : ''}${fmtBtc(x.btcQty)} BTC`,
      subVal:   $$(x.usdtAmount),
      valClass: x.btcQty >= 0 ? 'positive' : 'negative',
    })),
    ...state.futures.slice(0, 2).map(x => ({
      kind: 'futures', badge: 'FUT',
      title:    fmtDate(x.dateClose),
      sub:      `${x.side} · ${x.mode}`,
      val:      $$(x.pnlUsdt),
      valClass: x.pnlUsdt >= 0 ? 'positive' : 'negative',
    })),
  ].slice(0, 5), [state.dca, state.futures])

  return (
    <>
      {/* ── HERO CARD ─────────────────────────────── */}
      <div
        className="rounded-[20px] p-5"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        {/* Header row: label + Edit Goal */}
        <div className="flex items-start justify-between mb-1">
          <span className="label-xs">TOTAL BTC HOLDINGS</span>
          <button
            onClick={onEditGoal}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-chip shrink-0"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
          >
            Edit Goal
          </button>
        </div>

        {/* BTC number + refresh button */}
        <div className="flex items-center justify-between mt-1 mb-1">
          <div className="flex items-baseline gap-2">
            <span
              className="font-mono font-bold leading-none"
              style={{ fontSize: 56, letterSpacing: '-0.05em', color: 'var(--text)' }}
            >
              {fmtBtc(m.totalBtc, 4)}
            </span>
            <span className="font-bold text-[20px]" style={{ color: 'var(--muted)', letterSpacing: '-0.02em' }}>
              BTC
            </span>
          </div>

          {/* Minimal refresh button */}
          {typeof onRefresh === 'function' && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              aria-label="Refresh price"
              className="flex items-center justify-center rounded-full transition-opacity disabled:opacity-40"
              style={{
                width: 32, height: 32,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--muted)',
                flexShrink: 0,
              }}
            >
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                style={{ transform: refreshing ? 'none' : undefined,
                         animation: refreshing ? 'spin 0.8s linear infinite' : undefined }}
              >
                <path d="M23 4v6h-6"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
            </button>
          )}
        </div>

        {/* Invested cost (recorded — does NOT change with price) */}
        <p className="font-mono text-[13px] mb-0.5" style={{ color: 'var(--muted)' }}>
          Invested {fmtUsdCompact(m.totalInv)}&nbsp;·&nbsp;{fmtThbCompact(m.totalInv * m.usdthb)}
        </p>
        {/* Current market value (live) */}
        <p className="font-mono text-[11px] mb-4" style={{ color: 'var(--muted)', opacity: 0.65 }}>
          Value now {fmtUsdCompact(currentValueUsd)}&nbsp;·&nbsp;{fmtThbCompact(currentValueThb)}
        </p>

        {/* Progress bar */}
        <ProgressBar pct={goalPct} color="default" />

        {/* Remaining / Progress / Goal */}
        <div className="grid grid-cols-3 gap-3 mt-3 pt-3"
             style={{ borderTop: '1px solid var(--border)' }}>
          <div>
            <span className="label-xs">REMAINING</span>
            <p className="font-mono text-[13px] font-bold mt-1"
               style={{ color: '#f59e0b', letterSpacing: '-0.02em' }}>
              {fmtBtc(remaining, 4)} BTC
            </p>
          </div>
          <div className="text-center">
            <span className="label-xs">PROGRESS</span>
            <p className="font-mono text-[13px] font-bold mt-1" style={{ color: 'var(--text)' }}>
              {fmtPct(goalPct, 1)}
            </p>
          </div>
          <div className="text-right">
            <span className="label-xs">GOAL</span>
            <p className="font-mono text-[13px] font-bold mt-1" style={{ color: 'var(--text)' }}>
              {fmtBtc(settings.goalBtc, 4)} BTC
            </p>
          </div>
        </div>

        {/* 3-col metric blocks */}
        <div
          className="grid grid-cols-3 mt-3 rounded-[12px] overflow-hidden"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {/* AVG COST — with THB */}
          <SecMetric
            label="AVG COST"
            value={fmtUsdCompact(m.avgCost)}
            thb={`≈ ${fmtThbCompact(avgCostThb)}`}
            hint="per BTC"
            noBorder
          />
          {/* CURRENT PRICE — with THB */}
          <SecMetric
            label="CURRENT PRICE"
            value={fmtUsdCompact(m.price)}
            thb={`≈ ${fmtThbCompact(curPriceThb)}`}
            hint="live"
          />
          {/* UNREALIZED PNL — signed THB */}
          <SecMetric
            label="UNREALIZED PNL"
            value={`${unrealPos ? '+' : ''}${fmtUsdCompact(unrealPnlUsd)}`}
            thb={thbLine}
            hint={`${unrealPos ? '+' : ''}${fmtPct(unrealPnlPct, 1)}`}
            valueColor={unrealPos ? '#22c55e' : '#ef4444'}
            hintColor={unrealPos  ? '#22c55e' : '#ef4444'}
          />
        </div>
      </div>

      {/* ── PORTFOLIO BREAKDOWN ───────────────────── */}
      <PortfolioBreakdown
        dcaBtc={m.dcaBtc}
        dipBtc={m.dipBtc}
        price={m.price}
        usdthb={m.usdthb}
      />

      {/* ── PORTFOLIO HISTORY ────────────────────── */}
      <PortfolioHistory
        dca={state.dca}
        dip={state.dip}
        currentPrice={m.price}
      />

      {/* ── THIS MONTH ───────────────────────────── */}
      <div
        className="rounded-[16px] p-[18px]"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <p className="label-xs mb-3">THIS MONTH</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          <MonthCell
            value={`${m.moBtc >= 0 ? '+' : ''}${fmtBtc(m.moBtc, 4)}`}
            label="BTC ACCUM." color="#22c55e"
          />
          <MonthCell value={String(m.moCount)} label="ENTRIES" />
          <MonthCell value={fmtUsdCompact(m.moInv)} label="CAPITAL" />
        </div>
      </div>

      {/* ── CASH FLOW → BTC ──────────────────────── */}
      <Card>
        <CardHead title="Cash Flow → BTC" right={<span className="label-xs">ALL TIME</span>} />
        <div className="flex flex-col gap-3">
          <FlowRow
            icon="↗" iconBg="rgba(34,197,94,0.12)" iconColor="#22c55e"
            label="Futures PnL" cash={m.futPnl} btc={m.futsToBtc}
          />
          <FlowRow
            icon="⊞" iconBg="rgba(167,139,250,0.12)" iconColor="#a78bfa"
            label="Grid Bot PnL" cash={m.gridPnl} btc={m.gridToBtc}
          />
        </div>
        <div className="flex justify-between items-center mt-3 pt-3"
             style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>Total converted</span>
          <span className="font-mono text-[15px] font-bold"
                style={{ color: m.totalConverted >= 0 ? '#22c55e' : '#ef4444' }}>
            {m.totalConverted >= 0 ? '+' : ''}{fmtBtc(m.totalConverted, 4)} BTC
          </span>
        </div>
      </Card>

      {/* ── RECENT ACTIVITY ──────────────────────── */}
      <Card>
        <CardHead title="Recent Activity" />
        <div className="[&>*:last-child]:border-b-0">
          {recentRows.map((r, i) => <EntryRow key={i} {...r} />)}
        </div>
      </Card>

      {/* Spin keyframe for refresh icon */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}

/* ── Sub-components ────────────────────────────────── */

/**
 * SecMetric — 3-row metric tile: value / thb / hint
 * thb shown on its own line, muted
 */
function SecMetric({ label, value, thb, hint, valueColor, hintColor, noBorder }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-3 px-2 text-center"
      style={!noBorder ? { borderLeft: '1px solid var(--border)' } : {}}
    >
      <span className="label-xs mb-1">{label}</span>
      {/* Primary USD value */}
      <p className="font-mono text-[12px] font-bold leading-tight"
         style={{ color: valueColor || 'var(--text)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      {/* THB equivalent — own line, muted */}
      {thb && (
        <p className="font-mono text-[10px] mt-0.5"
           style={{ color: valueColor || 'var(--muted)', opacity: 0.6 }}>
          {thb}
        </p>
      )}
      {/* Secondary hint (per BTC / live / %) */}
      {hint && (
        <p className="font-mono text-[10px] mt-0.5"
           style={{ color: hintColor || 'var(--muted)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

function MonthCell({ value, label, color }) {
  return (
    <div>
      <p className="font-mono text-[19px] font-bold tracking-tight"
         style={{ color: color || 'var(--text)' }}>
        {value}
      </p>
      <span className="label-xs mt-1">{label}</span>
    </div>
  )
}

function FlowRow({ icon, iconBg, iconColor, label, cash, btc }) {
  return (
    <div className="grid grid-cols-[36px_1fr_18px_auto] items-center gap-2.5">
      <div className="w-9 h-9 rounded-[10px] grid place-items-center text-[14px] font-bold"
           style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <div>
        <p className="text-[12px]" style={{ color: 'var(--muted)' }}>{label}</p>
        <p className="font-mono text-[13px] font-bold"
           style={{ color: cash >= 0 ? '#22c55e' : '#ef4444' }}>
          {$$(cash)}
        </p>
      </div>
      <span style={{ color: 'var(--muted)' }}>→</span>
      <span className="font-mono text-[12px] font-bold text-right"
            style={{ color: btc >= 0 ? '#22c55e' : '#ef4444', minWidth: 80 }}>
        {btc >= 0 ? '+' : ''}{fmtBtc(btc, 4)} BTC
      </span>
    </div>
  )
}
