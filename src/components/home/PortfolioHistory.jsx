/**
 * PortfolioHistory — cumulative avg cost vs market price chart.
 * Uses existing DCA + Dip entries only. Additive card — no side effects.
 * Requires recharts (already in package.json).
 */
import { useMemo } from 'react'
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from 'recharts'
import { fmtPct } from '../../utils/format'

/** Build chronological avg-cost history from dca + dip arrays. */
function buildHistory(dca, dip) {
  const all = [
    ...dca.map(x => ({ date: x.date, btcQty: +x.btcQty || 0, usdtAmount: Math.abs(+x.usdtAmount || 0) })),
    ...dip.map(x => ({ date: x.date, btcQty: +x.btcQty || 0, usdtAmount: Math.abs(+x.usdtAmount || 0) })),
  ]
    .filter(x => x.btcQty > 0 && x.date)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))

  if (all.length === 0) return []

  let cumBtc  = 0
  let cumCost = 0

  return all.map(x => {
    cumBtc  += x.btcQty
    cumCost += x.usdtAmount
    const avgCost = cumBtc > 0 ? cumCost / cumBtc : 0
    const d = new Date(x.date)
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    return { label, avgCost: Math.round(avgCost) }
  })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <p style={{ color: 'var(--muted)', marginBottom: 4 }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: 0 }}>
          {p.name}: ${p.value?.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

export function PortfolioHistory({ dca, dip, currentPrice }) {
  const history = useMemo(() => buildHistory(dca, dip), [dca, dip])

  // Need at least 2 data points to draw a meaningful chart
  if (history.length < 2) return null

  const latestAvg  = history[history.length - 1].avgCost
  const drawdown   = currentPrice > 0 && latestAvg > 0
    ? (currentPrice - latestAvg) / latestAvg
    : 0
  const isPositive  = drawdown >= 0
  const drawdownClr = isPositive ? '#22c55e' : '#ef4444'

  const chartData = history.map(d => ({ ...d }))

  const allVals = chartData.map(d => d.avgCost).filter(Boolean)
  if (currentPrice > 0) allVals.push(currentPrice)
  const yMin = Math.floor(Math.min(...allVals) * 0.95 / 1000) * 1000
  const yMax = Math.ceil( Math.max(...allVals) * 1.05 / 1000) * 1000

  return (
    <div
      className="rounded-[16px] p-[18px]"
      style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="label-xs">PORTFOLIO HISTORY</p>
        <span
          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
          style={{
            background: isPositive ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: drawdownClr,
          }}
        >
          {isPositive ? '+' : ''}{fmtPct(drawdown * 100, 1)} vs avg
        </span>
      </div>

      {/* Chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fill: 'var(--muted)' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 9, fill: 'var(--muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Current market price — dashed reference line */}
            {currentPrice > 0 && (
              <ReferenceLine
                y={currentPrice}
                stroke={drawdownClr}
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{
                  value: `$${(currentPrice / 1000).toFixed(1)}k`,
                  position: 'insideTopRight',
                  fontSize: 9,
                  fill: drawdownClr,
                }}
              />
            )}

            {/* Avg cost line */}
            <Line
              type="monotone"
              dataKey="avgCost"
              name="Avg Cost"
              stroke="#e68a32"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#e68a32' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div style={{ width: 16, height: 2, background: '#e68a32', borderRadius: 1 }} />
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>Avg Cost</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div style={{
            width: 16, height: 0,
            borderTop: `2px dashed ${drawdownClr}`,
          }} />
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Market {currentPrice > 0 ? `$${(currentPrice / 1000).toFixed(1)}k` : '–'}
          </span>
        </div>
      </div>
    </div>
  )
}
