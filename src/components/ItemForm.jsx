import { useId, useRef, useState } from 'react'
import { addDays, addMonths, todayString } from '../utils/date.js'

const LOCATIONS = ['冷蔵', '冷凍', '常温']
const UNITS = ['個', 'g', 'kg', 'ml', '本', 'パック', '袋', '枚', '玉', '束', '缶', '切れ']
const EXPIRY_SHORTCUTS = [
  { label: '+3日', getDate: (today) => addDays(today, 3) },
  { label: '+1週間', getDate: (today) => addDays(today, 7) },
  { label: '+1か月', getDate: (today) => addMonths(today, 1) },
  { label: '+3か月', getDate: (today) => addMonths(today, 3) },
]
const DEFAULT_VALUES = { name: '', quantity: '1', unit: '個', expiry: '', location: '冷蔵' }

function toFormValues(item) {
  if (!item) return DEFAULT_VALUES
  return {
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    expiry: item.expiry ?? '',
    location: item.location,
  }
}

// mode: 'add'（追加後も開いたまま連続入力）/ 'edit'（1件の編集）
export default function ItemForm({ mode, initialItem, history, nameSuggestions, onSubmit, onCancel, onDelete }) {
  const [values, setValues] = useState(() => toFormValues(initialItem))
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const nameInputRef = useRef(null)
  const idPrefix = useId()
  const isAddMode = mode === 'add'

  function updateField(field, value) {
    setValues((prev) => ({ ...prev, [field]: value }))
  }

  function handleNameChange(event) {
    const name = event.target.value
    const previous = isAddMode ? history[name.trim()] : null
    setValues((prev) => (previous ? { ...prev, name, unit: previous.unit, location: previous.location } : { ...prev, name }))
    setError('')
    setMessage('')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const name = values.name.trim()
    const quantity = Number(values.quantity)
    if (!name) {
      setError('名前を入れてください')
      return
    }
    if (values.quantity === '' || Number.isNaN(quantity) || quantity < 0) {
      setError('数量は0以上の数字で入れてください')
      return
    }

    onSubmit({
      name,
      quantity,
      unit: values.unit.trim(),
      expiry: values.expiry,
      location: values.location,
    })

    if (isAddMode) {
      // 単位と保管場所は残し、名前・数量・期限だけ空に戻して続けて入力できるようにする
      setValues((prev) => ({ ...prev, name: '', quantity: DEFAULT_VALUES.quantity, expiry: '' }))
      setError('')
      setMessage(`「${name}」を追加しました`)
      nameInputRef.current?.focus()
    }
  }

  const today = todayString()

  return (
    <form className="item-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor={`${idPrefix}-name`}>名前</label>
        <input
          id={`${idPrefix}-name`}
          ref={nameInputRef}
          type="text"
          list={`${idPrefix}-names`}
          autoComplete="off"
          value={values.name}
          onChange={handleNameChange}
          placeholder="例：にんじん"
        />
        <datalist id={`${idPrefix}-names`}>
          {nameSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={`${idPrefix}-quantity`}>数量</label>
          <input
            id={`${idPrefix}-quantity`}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={values.quantity}
            onChange={(event) => updateField('quantity', event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor={`${idPrefix}-unit`}>単位</label>
          <input
            id={`${idPrefix}-unit`}
            type="text"
            list={`${idPrefix}-units`}
            autoComplete="off"
            value={values.unit}
            onChange={(event) => updateField('unit', event.target.value)}
          />
          <datalist id={`${idPrefix}-units`}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-expiry`}>賞味期限</label>
        <input
          id={`${idPrefix}-expiry`}
          type="date"
          value={values.expiry}
          onChange={(event) => updateField('expiry', event.target.value)}
        />
        <div className="chip-row">
          {EXPIRY_SHORTCUTS.map((shortcut) => (
            <button
              key={shortcut.label}
              type="button"
              className="chip"
              onClick={() => updateField('expiry', shortcut.getDate(today))}
            >
              {shortcut.label}
            </button>
          ))}
          <button type="button" className="chip chip--muted" onClick={() => updateField('expiry', '')}>
            なし
          </button>
        </div>
      </div>

      <fieldset className="field">
        <legend>保管場所</legend>
        <div className="chip-row">
          {LOCATIONS.map((location) => (
            <label key={location} className={values.location === location ? 'chip chip--selected' : 'chip'}>
              <input
                type="radio"
                name={`${idPrefix}-location`}
                value={location}
                checked={values.location === location}
                onChange={() => updateField('location', location)}
              />
              {location}
            </label>
          ))}
        </div>
      </fieldset>

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-message" role="status">{message}</p>}

      <div className="form-actions">
        <button type="submit" className="button button--primary">
          {isAddMode ? '追加する' : '保存する'}
        </button>
        <button type="button" className="button" onClick={onCancel}>
          {isAddMode ? '閉じる' : 'キャンセル'}
        </button>
      </div>

      {!isAddMode && onDelete && (
        <button type="button" className="button button--danger form-delete" onClick={onDelete}>
          この食材を削除
        </button>
      )}
    </form>
  )
}
