/**
 * DcaPage — DCA tracking & projection.
 * Big numbers centered inside cards per screenshot.
 */
import { useMemo } from 'react'
import { Card, CardHead }    from '../components/shared/Card'
import { MetricCard }        from '../components/shared/MetricCard'
import { ProgressBar }       from '../components/shared/ProgressBar'
import { MiniChart }         from '../components/shared/MiniChart'
import { EntryRow }          from '../components/shared/EntryRow'
import { estimateProjection } from '../utils/metrics'
import { fmtBtc, fmtUsdCompact, fmtPct, fmtDate, sortDesc } from '../utils/format'

const $$ = (v, d = 0) => {
  const n = Math.abs(Number(v) || 0), s = Number(v) < 0 ? '-' : ''
  return `${s}$${n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })}`
}

export function DcaPage({ state, onEditPlan, onDeleteEntry }) {
  const { settings } = state
  const dcaBtc   = useMemo(() => state.dca.reduce((s, x) => s + (+x.btcQty || 0), 0), [state.dca])
  const dipBtc   = useMemo(() => state.dip.reduce((s, x) => s + (+x.btcQty || 0), 0), [state.dip])
  const totalBtc = dcaBtc + dipBtc
  const proj     = useMemo(() => estimateProjection({ settings, dcaBtc: totalBtc }), [settings, totalBtc])
  const pct    = Math.min(100, (proj.currentBtc / proj.targetBTC) * 100)

  const chartPts = useMemo(() =>
    proj.path
      .filter((_, i) => i === 0 || i === proj.path.length - 1 || i % 12 === 0)
      .map(pt => ({ x: pt.age - proj.currentAge, y: pt.btc, label: `${Math.round(pt.age)}` })),
    [proj]
  )

  return (
    <>
      {/* ── DCA Stack Hero ─────────────────────────── */}
      <Card>
        <span className="label-xs">DCA STACK</span>

        {/* Two-column: big BTC left, meta right */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-center mt-3">

          {/* LEFT — centered large BTC value */}
          <div className="flex flex-col items-center justify-center text-center w-full py-2">
            <div className="flex items-baseline gap-1.5">
              <span
                className="font-mono font-bold leading-none"
                style={{ fontSize: 52, letterSpacing: '-0.05em', color: 'var(--text)' }}
              >
                {fmtBtc(proj.currentBtc, 4)}
              </span>
              <span className="text-[18px] font-bold" style={{ color: 'var(--muted)' }}>BTC</span>
            </div>
            <p className="font-mono text-[12px] mt-1" style={{ color: 'var(--muted)' }}>
              of {fmtBtc(proj.targetBTC, 4)} BTC
            </p>
          </div>

          {/* RIGHT — meta column */}
          <div
            className="flex flex-col gap-2.5 pl-4"
            style={{ borderLeft: '1px solid var(--border)' }}
          >
            <Meta label="TARGET"    value={`${fmtBtc(proj.targetBTC, 4)} BTC`} />
            <Meta label="BY AGE"    value={String(proj.targetAge)} />
            <Meta label="TIME LEFT" value={`${Math.max(0, proj.targetAge - proj.currentAge)} yrs`} />
          </div>
        </div>

        {/* Progress */}
        <ProgressBar pct={pct} color="orange" className="mt-4" />
        <div className="flex items-center justify-between mt-2">
          <span className="font-mono text-[11px]" style={{ color: 'var(--muted)' }}>{fmtPct(pct)}</span>
          <span className="text-[11px]" style={{ color: 'var(--muted)' }}>
            {pct < 5 ? 'Early days. Keep stacking.'
              : proj.onTrack ? 'On target. Stay consistent.'
              : 'Raise DCA to stay on track.'}
          </span>
        </div>
      </Card>

      {/* ── Estimated BTC at Age X ──────────────────── */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <span className="label-xs">ESTIMATED BTC AT AGE {proj.targetAge}</span>
          <span
            className="text-[11px] font-bold px-3 py-1.5 rounded-chip"
            style={{
              background: proj.onTrack ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
              color:      proj.onTrack ? '#22c55e' : '#f59e0b',
            }}
          >
            {proj.onTrack ? '✓ On target' : `−${fmtBtc(proj.shortfall, 3)} BTC`}
          </span>
        </div>

        {/* Two-column: big est. BTC centered left, mini stats right */}
        <div className="grid grid-cols-[1fr_auto] gap-4 items-center">

          {/* LEFT — centered */}
          <div className="flex flex-col items-center justify-center text-center w-full py-1">
            <span
              className="font-mono font-bold leading-none"
              style={{
                fontSize: 52, letterSpacing: '-0.05em',
                color: proj.onTrack ? '#22c55e' : '#f59e0b',
              }}
            >
              {fmtBtc(proj.estimatedBTCAtTargetAge, 3)}
            </span>
            <p className="text-[13px] mt-1" style={{ color: 'var(--muted)' }}>BTC</p>
          </div>

          {/* RIGHT — stats */}
          <div className="flex flex-col gap-2 min-w-[120px]">
            <MiniStat label="REACH AGE"
                      value={proj.reachAge > 100 ? '100+' : proj.reachAge.toFixed(1)}
                      sub="At current pace" />
            <MiniStat label="GAP AT TARGET"
                      value={proj.onTrack ? 'On target' : `−${fmtBtc(proj.shortfall, 3)} BTC`}
                      sub={`By age ${proj.targetAge}`} />
            <MiniStat label="NEED / MONTH"
                      value={$$(proj.requiredDca)}
                      sub={`To hit age ${proj.targetAge}`} />
          </div>
        </div>
      </Card>

      {/* ── Plan & Assumptions ──────────────────────── */}
      <Card>
        <CardHead
          title="Plan & Assumptions"
          right={
            <button
              onClick={onEditPlan}
              className="text-[12px] font-semibold"
              style={{ color: '#60a5fa' }}
            >Edit</button>
          }
        />
        <div className="grid grid-cols-2 gap-2">
          {[
            ['AGE',         String(proj.currentAge),          'years'],
            ['TARGET AGE',  String(proj.targetAge),           'years'],
            ['DCA STACK',   fmtBtc(proj.currentBtc, 4),      'BTC'],
            ['MONTHLY DCA', $$(proj.monthlyDcaUsd),           '/month'],
            ['BTC PRICE',   fmtUsdCompact(proj.currentPrice), 'per BTC'],
            ['GROWTH',      `${settings.annualGrowthRate}%`,  '/year'],
          ].map(([l, v, h]) => (
            <div
              key={l}
              className="rounded-[10px] p-3"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span className="label-xs">{l}</span>
              {/* Value — large, readable in both themes */}
              <p
                className="font-mono text-[17px] font-bold mt-1"
                style={{ letterSpacing: '-0.03em', color: 'var(--text)' }}
              >
                {v}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>{h}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] mt-3" style={{ color: 'var(--muted)' }}>
          Assumes {settings.annualGrowthRate}% annual BTC price growth. Live price auto-updates.
        </p>
      </Card>

      {/* ── BTC Growth Chart ────────────────────────── */}
      <Card>
        <CardHead title="BTC Growth Projection" />
        <MiniChart
          points={chartPts}
          goalY={proj.targetBTC}
          pillText={`${fmtBtc(proj.estimatedBTCAtTargetAge, 3)} BTC`}
        />
        <div
          className="mt-3 p-3 rounded-[10px] text-[13px] leading-relaxed"
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.15)',
            color: 'var(--text2)',
          }}
        >
          {proj.onTrack
            ? <>At age <strong style={{ color: 'var(--text)' }}>{proj.targetAge}</strong>, your path
                reaches <strong style={{ color: 'var(--text)' }}>{fmtBtc(proj.estimatedBTCAtTargetAge, 3)} BTC</strong>. ✓</>
            : <>At age <strong style={{ color: 'var(--text)' }}>{proj.targetAge}</strong> you'll have{' '}
                <strong style={{ color: 'var(--text)' }}>{fmtBtc(proj.estimatedBTCAtTargetAge, 3)} BTC</strong>.
                Raise DCA to <strong style={{ color: 'var(--text)' }}>{$$(proj.requiredDca)}/month</strong> to hit goal.</>
          }
        </div>
      </Card>

      {/* ── What-If Scenarios ───────────────────────── */}
      <Card>
        <CardHead title="What-If Scenarios" />
        {proj.suggestions.map((s, i) => (
          <div
            key={i}
            className="flex items-center gap-3 py-3"
            style={{ borderBottom: i < proj.suggestions.length - 1 ? '1px solid var(--border)' : 'none' }}
          >
            <div
              className="w-10 h-10 rounded-[10px] grid place-items-center text-[18px] shrink-0"
              style={{
                background: i === 0
                  ? 'rgba(34,197,94,0.12)'
                  : i === 1
                    ? 'rgba(245,158,11,0.12)'
                    : 'rgba(167,139,250,0.12)',
              }}
            >
              {s.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{s.label}</p>
              <p className="text-[12px] mt-0.5" style={{ color: 'var(--text2)' }}>
                Reach goal at age <strong className="font-mono">{s.reach.toFixed(1)}</strong>
              </p>
              <p className="text-[11px] font-semibold mt-0.5"
                 style={{ color: s.isEarly ? '#22c55e' : '#f59e0b' }}>
                {s.diffLabel}
              </p>
            </div>
          </div>
        ))}
      </Card>

      {/* ── DCA Entries ─────────────────────────────── */}
      <Card>
        <CardHead
          title="DCA Entries"
          right={<span className="label-xs">{state.dca.length} entries</span>}
        />
        <div className="[&>*:last-child]:border-b-0">
          {[...state.dca]
            .sort((a, b) => sortDesc(a, b, 'date'))
            .slice(0, 20)
            .map((x, i) => (
              <EntryRow
                key={x._id || i} kind="dca" badge="DCA"
                title={fmtDate(x.date)}
                sub={(x.note || x.source || '').replace(/, 1m candle/g, '').slice(0, 40)}
                val={`${x.btcQty >= 0 ? '+' : ''}${fmtBtc(x.btcQty)} BTC`}
                subVal={$$(x.price, 0)}
                valClass={x.btcQty >= 0 ? 'positive' : 'negative'}
                onDelete={onDeleteEntry ? () => {
                  if (window.confirm('Delete this entry?'))
                    onDeleteEntry('dca', x._id || x)
                } : undefined}
              />
            ))}
        </div>
      </Card>
    </>
  )
}

function Meta({ label, value }) {
  return (
    <div>
      <span className="label-xs">{label}</span>
      <p className="font-mono text-[13px] font-bold mt-0.5" style={{ color: 'var(--text)' }}>{value}</p>
    </div>
  )
}

function MiniStat({ label, value, sub }) {
  return (
    <div
      className="rounded-[10px] px-3 py-2.5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <span className="label-xs">{label}</span>
      <p className="font-mono text-[13px] font-bold mt-1" style={{ color: 'var(--text)', letterSpacing: '-0.02em' }}>{value}</p>
      <p className="text-[10px] mt-0.5" style={{ color: 'var(--muted)' }}>{sub}</p>
    </div>
  )
}
