import { useState } from 'react'
import { X } from 'lucide-react'

const MODES = ['DCA', 'Dip', 'Futures', 'Grid']

/* ── Stable input style object ── */
function inputStyle(opts = {}) {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    padding: '11px 14px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: 500,
    outline: 'none',
    width: '100%',
    transition: 'border-color .15s',
    borderRadius: opts.leftOnly ? '10px 0 0 10px'
                : opts.rightOnly ? '0 10px 10px 0'
                : '10px',
    borderRight: opts.leftOnly ? 'none' : '1px solid var(--border)',
    ...opts.extra,
  }
}

/* ── Placeholder style — injected once via <style> in JSX ── */
const PLACEHOLDER_CSS = `
  .ae-input::placeholder { color: rgba(255,255,255,0.30); }
  .ae-sel { color: rgba(255,255,255,0.80); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 11px 10px; font-size: 13px; font-weight: 500; outline: none; cursor: pointer; appearance: none; -webkit-appearance: none; }
  .ae-sel option { background: #1c1f28; }
`

/* ── DateDropdown ── */
function DateDropdown({ label, value, onChange }) {
  const today = new Date()
  const curYear = today.getFullYear()

  const safe = value && value.length === 10 ? value : today.toISOString().slice(0, 10)
  const [yy, mm, dd] = safe.split('-')

  const emit = (y, m, d) => onChange(`${y}-${m}-${d}`)

  const years  = Array.from({ length: 11 }, (_, i) => String(curYear - 5 + i))
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
  const days   = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

  const selStyle = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '11px 8px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: 500,
    outline: 'none',
    cursor: 'pointer',
    width: '100%',
    appearance: 'none',
    WebkitAppearance: 'none',
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-[0.07em] uppercase" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: '2fr 2fr 3fr' }}>
        <select style={selStyle} value={dd} onChange={e => emit(yy, mm, e.target.value)}>
          {days.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select style={selStyle} value={mm} onChange={e => emit(yy, e.target.value, dd)}>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={selStyle} value={yy} onChange={e => emit(e.target.value, mm, dd)}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  )
}

/* ── InputWithUnit ── */
function InputWithUnit({ label, type = 'text', value, onChange, placeholder, step, unit, helper, required }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-[0.07em] uppercase" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="flex items-stretch">
        <input
          type={type}
          className="ae-input"
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          step={step}
          required={required}
          style={inputStyle({ leftOnly: !!unit })}
        />
        {unit && (
          <div
            className="shrink-0 flex items-center justify-center px-3 text-[11px] font-bold"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              borderRadius: '0 10px 10px 0',
              minWidth: 44,
              color: 'var(--muted)',
            }}
          >
            {unit}
          </div>
        )}
      </div>
      {helper && (
        <span className="text-[11px]" style={{ color: 'var(--muted)', paddingLeft: 2 }}>
          {helper}
        </span>
      )}
    </div>
  )
}

/* ── SelectRow ── */
function SelectRow({ label, value, onChange, options }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold tracking-[0.07em] uppercase" style={{ color: 'var(--muted)' }}>
        {label}
      </span>
      <div className="flex gap-1.5">
        {options.map(opt => (
          <button
            key={opt} type="button"
            onClick={() => onChange(opt)}
            className="flex-1 py-2.5 text-[13px] font-semibold rounded-[10px] transition-colors"
            style={{
              background: value === opt ? 'var(--text)' : 'var(--surface)',
              border: '1px solid var(--border)',
              color: value === opt ? 'var(--card)' : 'var(--muted)',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Main component ── */
export function AddEntrySheet({ open, onClose, onSave, settings }) {
  const [mode, setMode]       = useState('DCA')
  const [form, setForm]       = useState({})
  const [lastEdited, setLastEdited] = useState('btc')

  if (!open) return null

  const livePrice     = Number(settings?.currentPrice) || 71000
  const usdthb        = Number(settings?.usdthb)       || 32.86
  const effectivePrice = Number(form.price) > 0 ? Number(form.price) : livePrice

  const todayStr = new Date().toISOString().slice(0, 10)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  /* ── Auto-calc handlers ── */
  function handleBtc(raw) {
    setLastEdited('btc')
    const btcNum = parseFloat(raw)
    const newUsd = !isNaN(btcNum) && btcNum > 0 && effectivePrice > 0
      ? (btcNum * effectivePrice).toFixed(2)
      : form.usdtAmount ?? ''
    setForm(f => ({ ...f, btcQty: raw, usdtAmount: newUsd }))
  }

  function handleUsd(raw) {
    setLastEdited('usd')
    const usdNum = parseFloat(raw)
    const newBtc = !isNaN(usdNum) && usdNum > 0 && effectivePrice > 0
      ? (usdNum / effectivePrice).toFixed(6)
      : form.btcQty ?? ''
    setForm(f => ({ ...f, usdtAmount: raw, btcQty: newBtc }))
  }

  function handlePrice(raw) {
    const px = parseFloat(raw)
    setForm(f => {
      const next = { ...f, price: raw }
      if (!isNaN(px) && px > 0) {
        if (lastEdited === 'btc' && parseFloat(f.btcQty) > 0) {
          next.usdtAmount = (parseFloat(f.btcQty) * px).toFixed(2)
        } else if (lastEdited === 'usd' && parseFloat(f.usdtAmount) > 0) {
          next.btcQty = (parseFloat(f.usdtAmount) / px).toFixed(6)
        }
      }
      return next
    })
  }

  /* ── Helper text ── */
  const fmtThb = v => Number(v) > 0 ? `≈ ฿${(Number(v) * usdthb).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null
  const fmtBtcToUsd = v => Number(v) > 0 ? `≈ $${(Number(v) * effectivePrice).toLocaleString('en-US', { maximumFractionDigits: 0 })}` : null

  function futPnlHint() {
    const en = parseFloat(form.entryPrice)
    const ex = parseFloat(form.exitPrice)
    const sz = parseFloat(form.sizeBtc)
    const sd = form.side || 'Long'
    if (!en || !ex || !sz) return null
    const pnl = sd === 'Long' ? (ex - en) * sz : (en - ex) * sz
    return `PnL ≈ ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`
  }

  function gridRoiHint() {
    const cap = parseFloat(form.capitalUsdt)
    const pnl = parseFloat(form.netProfitUsdt)
    if (!cap || !pnl) return null
    return `ROI ≈ ${((pnl / cap) * 100).toFixed(2)}%`
  }

  /* ── Save ── */
  function handleSave(e) {
    e.preventDefault()
    const today = todayStr
    if (mode === 'Futures') {
      onSave('futures', {
        dateOpen: form.dateOpen || today, dateClose: form.dateClose || today,
        symbol: 'BTCUSDT', side: form.side || 'Long',
        leverage: form.leverage ? `${form.leverage}x` : '3x',
        mode: form.tradeMode || 'Cross',
        entryPrice: +form.entryPrice || 0, exitPrice: +form.exitPrice || 0,
        sizeBtc: +form.sizeBtc || 0, pnlUsdt: +form.pnlUsdt || 0,
        mistakeTag: form.mistakeTag || null, notes: form.notes || null,
        strategy: 'Futures',
      })
    } else if (mode === 'Grid') {
      onSave('grid', {
        dateStart: form.dateStart || today, dateEnd: form.dateEnd || today,
        gridType: form.gridType || 'Spot', mode: form.gridMode || 'Arithmetic',
        capitalUsdt: +form.capitalUsdt || 0, netProfitUsdt: +form.netProfitUsdt || 0,
        roi: +form.roi || 0, note: form.gridNote || '', strategy: 'Grid Bot',
      })
    } else {
      onSave(mode === 'Dip' ? 'dip' : 'dca', {
        date: form.date || today, type: 'BUY',
        source: form.source || 'Manual',
        btcQty: +form.btcQty || 0, usdtAmount: +form.usdtAmount || 0,
        thbAmount: +form.thbAmount || 0,
        price: +form.price || 0, note: form.note || '',
        location: form.location || 'Wallet',
        strategy: mode === 'Dip' ? 'Dip Reserve' : 'DCA',
      })
    }
    setForm({})
    setLastEdited('btc')
    onClose()
  }

  return (
    <>
      {/* Inject placeholder style safely in JSX */}
      <style>{PLACEHOLDER_CSS}</style>

      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-black/50" onClick={onClose} />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[100] max-w-[430px] mx-auto rounded-t-[24px] max-h-[92svh] overflow-y-auto"
        style={{ background: 'var(--card)', borderTop: '1px solid var(--border)' }}
      >
        {/* Sticky header */}
        <div
          className="sticky top-0 z-10 pt-3 pb-2 px-5"
          style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}
        >
          <div className="w-10 h-1 rounded-full mx-auto mb-3" style={{ background: 'var(--border)' }} />
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[18px] font-bold" style={{ color: 'var(--text)' }}>Add Entry</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full grid place-items-center"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Mode tabs */}
          <div className="grid grid-cols-4 gap-1.5">
            {MODES.map(m => (
              <button
                key={m} type="button"
                onClick={() => { setMode(m); setForm({}); setLastEdited('btc') }}
                className="py-2 rounded-[8px] text-[12px] font-semibold border transition-colors"
                style={{
                  background:  mode === m ? 'var(--text)'  : 'var(--surface)',
                  borderColor: mode === m ? 'var(--text)'  : 'var(--border)',
                  color:       mode === m ? 'var(--card)'  : 'var(--muted)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Form body */}
        <form onSubmit={handleSave} className="px-5 py-4 flex flex-col gap-3.5">

          {/* ── DCA / Dip ── */}
          {(mode === 'DCA' || mode === 'Dip') && (
            <>
              <DateDropdown
                label="Date"
                value={form.date || todayStr}
                onChange={v => set('date', v)}
              />
              <InputWithUnit
                label="BTC Amount" type="number"
                value={form.btcQty} onChange={handleBtc}
                placeholder="0.00500" step="0.000001" unit="BTC"
                helper={fmtBtcToUsd(form.btcQty)}
              />
              <InputWithUnit
                label="Price" type="number"
                value={form.price} onChange={handlePrice}
                placeholder={String(livePrice)} step="1" unit="USD"
                helper={fmtThb(form.price || livePrice)}
              />
              <InputWithUnit
                label="USD Amount" type="number"
                value={form.usdtAmount} onChange={handleUsd}
                placeholder="325.00" step="0.01" unit="USD"
                helper={fmtThb(form.usdtAmount)}
              />
              <InputWithUnit
                label="THB Amount (actual)" type="number"
                value={form.thbAmount} onChange={v => set('thbAmount', v)}
                placeholder="e.g. 10500" step="1" unit="THB"
                helper="Optional — actual THB paid at time of purchase"
              />
              <div className="grid grid-cols-2 gap-2.5">
                <InputWithUnit label="Exchange" type="text" value={form.source}   onChange={v => set('source', v)}   placeholder="Bitkub" />
                <InputWithUnit label="Wallet"   type="text" value={form.location} onChange={v => set('location', v)} placeholder="Trezor" />
              </div>
              <InputWithUnit label="Note" type="text" value={form.note} onChange={v => set('note', v)} placeholder="Auto DCA (THB→USDT)" />
            </>
          )}

          {/* ── Futures ── */}
          {mode === 'Futures' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <DateDropdown label="Date Open"  value={form.dateOpen  || todayStr} onChange={v => set('dateOpen', v)} />
                <DateDropdown label="Date Close" value={form.dateClose || todayStr} onChange={v => set('dateClose', v)} />
              </div>
              <SelectRow label="Side" value={form.side || 'Long'}       onChange={v => set('side', v)}      options={['Long', 'Short']} />
              <SelectRow label="Mode" value={form.tradeMode || 'Cross'} onChange={v => set('tradeMode', v)} options={['Cross', 'Isolated']} />
              <InputWithUnit label="Leverage"    type="number" value={form.leverage}   onChange={v => set('leverage', v)}   placeholder="3"      step="1"      unit="x" />
              <div className="grid grid-cols-2 gap-2.5">
                <InputWithUnit label="Entry Price" type="number" value={form.entryPrice} onChange={v => set('entryPrice', v)} placeholder="65000" step="0.01" unit="USD" />
                <InputWithUnit label="Exit Price"  type="number" value={form.exitPrice}  onChange={v => set('exitPrice', v)}  placeholder="70000" step="0.01" unit="USD" />
              </div>
              <InputWithUnit label="Size"         type="number" value={form.sizeBtc}    onChange={v => set('sizeBtc', v)}    placeholder="0.035"  step="0.0001" unit="BTC" helper={futPnlHint()} />
              <InputWithUnit label="Realized PnL" type="number" value={form.pnlUsdt}    onChange={v => set('pnlUsdt', v)}    placeholder="100.33" step="0.01"   unit="USD" helper={form.pnlUsdt ? fmtThb(Math.abs(parseFloat(form.pnlUsdt))) : null} />
              <InputWithUnit label="Mistake Tag"  type="text"   value={form.mistakeTag} onChange={v => set('mistakeTag', v)} placeholder="Stop Hunt / Late Entry" />
              <InputWithUnit label="Note"         type="text"   value={form.notes}      onChange={v => set('notes', v)}      placeholder="Sweep → TP" />
            </>
          )}

          {/* ── Grid ── */}
          {mode === 'Grid' && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <DateDropdown label="Date Start" value={form.dateStart || todayStr} onChange={v => set('dateStart', v)} />
                <DateDropdown label="Date End"   value={form.dateEnd   || todayStr} onChange={v => set('dateEnd', v)} />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <SelectRow label="Grid Type" value={form.gridType || 'Spot'}       onChange={v => set('gridType', v)} options={['Spot', 'Futures']} />
                <SelectRow label="Mode"      value={form.gridMode || 'Arithmetic'} onChange={v => set('gridMode', v)} options={['Arithmetic', 'Geometric']} />
              </div>
              <InputWithUnit label="Capital"    type="number" value={form.capitalUsdt}   onChange={v => set('capitalUsdt', v)}   placeholder="1000"   step="0.01" unit="USD" helper={fmtThb(form.capitalUsdt)} />
              <InputWithUnit label="Net Profit" type="number" value={form.netProfitUsdt} onChange={v => set('netProfitUsdt', v)} placeholder="120.00" step="0.01" unit="USD" helper={gridRoiHint()} />
              <InputWithUnit label="ROI"        type="number" value={form.roi}           onChange={v => set('roi', v)}           placeholder="3.57"   step="0.01" unit="%" />
              <InputWithUnit label="Note"       type="text"   value={form.gridNote}      onChange={v => set('gridNote', v)}      placeholder="Closed near upper range" />
            </>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2.5 pt-1 pb-2">
            <button
              type="button" onClick={onClose}
              className="py-3 rounded-[12px] text-[14px] font-semibold"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text2)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-3 rounded-[12px] text-[14px] font-bold hover:opacity-90 transition-opacity"
              style={{ background: 'var(--text)', color: 'var(--card)' }}
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
