import { addDays, addMonths } from './date.js'

export const TEMPLATE_HEADERS = ['食材名', '数量', '単位', '期限', '保管場所']

// まず UTF-8 として読み、読めなければ Shift_JIS（Excel で保存したCSVに多い）で読み直す
export function decodeCsvBuffer(buffer) {
  const bytes = new Uint8Array(buffer)
  let text
  let encoding
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    encoding = 'UTF-8'
  } catch {
    text = new TextDecoder('shift_jis').decode(bytes)
    encoding = 'Shift_JIS'
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return { text, encoding }
}

// ダブルクォートで囲んだ値（カンマ・改行・"" を含む）にも対応する。空行は除く
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        cell += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(cell)
      cell = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  return rows.filter((r) => r.some((value) => value.trim() !== ''))
}

function escapeCsvCell(value) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows) {
  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\r\n') + '\r\n'
}

// ひな形の記入例（架空の食材）。期限は今日を基準にする
export function buildTemplateCsv(today) {
  return toCsv([
    TEMPLATE_HEADERS,
    ['にんじん', '3', '本', addDays(today, 7), '冷蔵'],
    ['豚こま切れ肉', '300', 'g', '', '冷凍'],
    ['ツナ缶', '2', '缶', addMonths(today, 6), '常温'],
  ])
}
