export const LOCATIONS = ['冷蔵', '冷凍', '常温']
export const MAX_IMPORT_ROWS = 500

export const FIELDS = [
  { key: 'name', label: '食材名' },
  { key: 'quantity', label: '数量' },
  { key: 'unit', label: '単位' },
  { key: 'expiry', label: '期限' },
  { key: 'location', label: '保管場所' },
]

const HEADER_ALIASES = {
  name: ['name', '食材名', '食材', '名前', '品名', '品目', '商品名'],
  quantity: ['quantity', 'qty', '数量', '個数', '量'],
  unit: ['unit', '単位'],
  expiry: ['expiry', '期限', '賞味期限', '消費期限', '期限日', '賞味期限日', '消費期限日'],
  location: ['location', '保管場所', '場所', '保存場所', '保管'],
}

const DEFAULT_QUANTITY = 1
const DEFAULT_UNIT = '個'
const DEFAULT_LOCATION = '冷蔵'

// 全角の数字・記号を半角にそろえる（例：２０２６／１２／３１ → 2026/12/31）
function toHalfWidth(value) {
  return value.replace(/[０-９．／－]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)).replace(/ー/g, '-')
}

function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/[\s　]/g, '')
}

// CSVの各列が、アプリのどの項目に当たるかを推測する。当たらない列は ''（取り込まない）
export function guessMapping(headers) {
  const used = new Set()
  return headers.map((header) => {
    const normalized = normalizeHeader(header)
    const field = FIELDS.find(
      ({ key }) => !used.has(key) && HEADER_ALIASES[key].some((alias) => normalizeHeader(alias) === normalized),
    )
    if (!field) return ''
    used.add(field.key)
    return field.key
  })
}

// 2026-12-31 / 2026/12/31 / 2026.12.31 / 2026年12月31日 を 'YYYY-MM-DD' にする。読めなければ null
export function normalizeDate(raw) {
  const value = toHalfWidth(raw.trim())
  const match = value.match(/^(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})日?$/)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// 冷蔵庫・野菜室 → 冷蔵、冷凍庫 → 冷凍、室温・棚 → 常温。読めなければ null
export function normalizeLocation(raw) {
  const value = raw.trim()
  if (LOCATIONS.includes(value)) return value
  if (value.startsWith('冷凍')) return '冷凍'
  if (value.startsWith('冷蔵') || value === '野菜室' || value === 'チルド') return '冷蔵'
  if (['室温', '棚', 'パントリー', '常温保存'].includes(value)) return '常温'
  return null
}

// 見出しを除いたデータ行を、取り込む食材の一覧に変える。line は CSV上の行番号（見出しが1行目）
export function buildImportPreview(dataRows, mapping) {
  const items = []
  const skipped = []
  const warnings = []

  dataRows.forEach((row, index) => {
    const line = index + 2
    const raw = {}
    mapping.forEach((key, column) => {
      if (key) raw[key] = (row[column] ?? '').trim()
    })

    const name = raw.name ?? ''
    if (!name) {
      skipped.push({ line, reason: '食材名が空' })
      return
    }

    let quantity = DEFAULT_QUANTITY
    if (raw.quantity) {
      const parsed = Number(toHalfWidth(raw.quantity))
      if (Number.isNaN(parsed) || parsed < 0) {
        warnings.push({ line, message: `数量「${raw.quantity}」が読めないため 1 にしました` })
      } else {
        quantity = parsed
      }
    }

    let expiry = ''
    if (raw.expiry) {
      const normalized = normalizeDate(raw.expiry)
      if (normalized) {
        expiry = normalized
      } else {
        warnings.push({ line, message: `期限「${raw.expiry}」が読めないため、期限なしにしました` })
      }
    }

    let location = DEFAULT_LOCATION
    if (raw.location) {
      const normalized = normalizeLocation(raw.location)
      if (normalized) {
        location = normalized
      } else {
        warnings.push({ line, message: `保管場所「${raw.location}」が読めないため、冷蔵にしました` })
      }
    }

    items.push({ name, quantity, unit: raw.unit || DEFAULT_UNIT, expiry, location })
  })

  return { items, skipped, warnings }
}
