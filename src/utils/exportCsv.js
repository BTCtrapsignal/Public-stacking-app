/**
 * exportCsv — generate and download CSV files from app state.
 * Pure utility — no side effects other than triggering a browser download.
 */

function toCsv(headers, rows) {
  const escape = v => {
    const s = v == null ? '' : String(v)
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(r => r.map(escape).join(',')),
  ]
  return lines.join('\n')
}

function download(filename, csv) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export function exportDcaCsv(entries) {
  const headers = ['Date', 'Type', 'Source', 'BTC Qty', 'USDT Amount', 'THB Amount', 'Price (USD)', 'Note', 'Location', 'Strategy']
  const rows = entries.map(x => [
    x.date, x.type, x.source, x.btcQty, x.usdtAmount, x.thbAmount || '', x.price, x.note, x.location, x.strategy,
  ])
  download('dca_entries.csv', toCsv(headers, rows))
}

export function exportDipCsv(entries) {
  const headers = ['Date', 'Type', 'Source', 'BTC Qty', 'USDT Amount', 'THB Amount', 'Price (USD)', 'Note', 'Location', 'Strategy']
  const rows = entries.map(x => [
    x.date, x.type, x.source, x.btcQty, x.usdtAmount, x.thbAmount || '', x.price, x.note, x.location, x.strategy,
  ])
  download('dip_reserve.csv', toCsv(headers, rows))
}

export function exportFuturesCsv(entries) {
  const headers = [
    'Date Open', 'Date Close', 'Symbol', 'Side', 'Leverage', 'Mode',
    'Entry Price', 'Exit Price', 'Size BTC', 'PnL (USDT)', 'ROI %', 'Mistake Tag', 'Notes',
  ]
  const rows = entries.map(x => [
    x.dateOpen, x.dateClose, x.symbol, x.side, x.leverage, x.mode,
    x.entryPrice, x.exitPrice, x.sizeBtc, x.pnlUsdt, x.roi, x.mistakeTag, x.notes,
  ])
  download('futures_journal.csv', toCsv(headers, rows))
}

export function exportGridCsv(entries) {
  const headers = ['Date Start', 'Date End', 'Grid Type', 'Mode', 'Capital (USDT)', 'Net Profit (USDT)', 'ROI %', 'Note']
  const rows = entries.map(x => [
    x.dateStart, x.dateEnd, x.gridType, x.mode, x.capitalUsdt, x.netProfitUsdt, x.roi, x.note,
  ])
  download('grid_bot.csv', toCsv(headers, rows))
}

export function exportAllCsv(state) {
  // All sheets combined into one file with section headers
  const now = new Date().toISOString().slice(0, 10)

  const dcaHeaders = ['Sheet', 'Date', 'Type', 'Source', 'BTC Qty', 'USDT Amount', 'THB Amount', 'Price (USD)', 'Note', 'Location']
  const dcaRows = state.dca.map(x => ['DCA', x.date, x.type, x.source, x.btcQty, x.usdtAmount, x.thbAmount || '', x.price, x.note, x.location])
  const dipRows = state.dip.map(x => ['DIP', x.date, x.type, x.source, x.btcQty, x.usdtAmount, x.thbAmount || '', x.price, x.note, x.location])

  const futHeaders = ['Sheet', 'Date Close', 'Side', 'Leverage', 'Mode', 'Entry', 'Exit', 'Size BTC', 'PnL USDT', 'Mistake Tag']
  const futRows = state.futures.map(x => ['FUT', x.dateClose, x.side, x.leverage, x.mode, x.entryPrice, x.exitPrice, x.sizeBtc, x.pnlUsdt, x.mistakeTag])

  const gridHeaders = ['Sheet', 'Date End', 'Grid Type', 'Mode', 'Capital USDT', 'Net Profit USDT', 'ROI %']
  const gridRows = state.grid.map(x => ['GRID', x.dateEnd, x.gridType, x.mode, x.capitalUsdt, x.netProfitUsdt, x.roi])

  const sections = [
    '# BTC STACKING EXPORT — ' + now,
    '',
    '# DCA + DIP ENTRIES',
    toCsv(dcaHeaders, [...dcaRows, ...dipRows]),
    '',
    '# FUTURES JOURNAL',
    toCsv(futHeaders, futRows),
    '',
    '# GRID BOT',
    toCsv(gridHeaders, gridRows),
  ]

  const blob = new Blob(['\ufeff' + sections.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `btc_stacking_export_${now}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
