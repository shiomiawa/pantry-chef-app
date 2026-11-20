import { useId, useState } from 'react'
import { getCategoryInfo, guessCategory } from '../utils/category.js'

export const MAX_WANTS = 3
const MAX_WANT_LENGTH = 20

// 今日食べたいもの：在庫の食材名を候補に出しつつ、在庫にない食材も文字で入れられる
export default function WantedFoodsInput({ wants, onChange, stockNames }) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const inputId = useId()
  const isFull = wants.length >= MAX_WANTS

  function handleAdd() {
    const name = text.trim()
    if (!name) return
    if (name.length > MAX_WANT_LENGTH) {
      setError(`${MAX_WANT_LENGTH}文字までにしてください`)
      return
    }
    if (wants.includes(name)) {
      setError('すでに入っています')
      return
    }
    onChange([...wants, name])
    setText('')
    setError('')
  }

  function handleKeyDown(event) {
    // 日本語入力の変換確定の Enter では追加しない
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="field">
      <label htmlFor={inputId}>今日食べたいもの（任意・{MAX_WANTS}つまで）</label>
      {wants.length > 0 && (
        <div className="chip-row">
          {wants.map((want) => (
            <span key={want} className="chip chip--selected want-chip">
              <span className="chip__icon" aria-hidden="true">
                {getCategoryInfo(guessCategory(want)).icon}
              </span>
              {want}
              <button
                type="button"
                className="want-chip__remove"
                aria-label={`${want}を外す`}
                onClick={() => onChange(wants.filter((w) => w !== want))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="inline-input">
        <input
          id={inputId}
          type="text"
          list={`${inputId}-stock`}
          autoComplete="off"
          value={text}
          disabled={isFull}
          placeholder={isFull ? `${MAX_WANTS}つまで入れました` : '例：サバ（在庫にない食材もOK）'}
          onChange={(event) => {
            setText(event.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
        />
        <datalist id={`${inputId}-stock`}>
          {stockNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button type="button" className="button" disabled={isFull || !text.trim()} onClick={handleAdd}>
          追加
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  )
}
