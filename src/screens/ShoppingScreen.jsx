import { useMemo, useState } from 'react'
import ItemForm from '../components/ItemForm.jsx'
import ShoppingRow from '../components/ShoppingRow.jsx'
import { usePantryItems } from '../hooks/usePantryItems.js'
import { useShoppingList } from '../hooks/useShoppingList.js'
import { parseAmount } from '../utils/parseAmount.js'

const MAX_NAME_LENGTH = 40

// 購入済みの食材を在庫に入れるときの初期値。分量が「200g」なら数量200・単位g、保管場所などは前回の値
function buildRestockItem(entry, history) {
  const previous = history[entry.name]
  const parsed = parseAmount(entry.amount)
  return {
    name: entry.name,
    quantity: parsed?.quantity ?? 1,
    unit: parsed?.unit || previous?.unit || '個',
    expiry: '',
    location: previous?.location ?? '冷蔵',
    category: previous?.category,
  }
}

export default function ShoppingScreen() {
  const { items: pantryItems, history, addItem } = usePantryItems()
  const { items, addItems, toggleChecked, removeItem, clearChecked } = useShoppingList()
  const [text, setText] = useState('')
  const [message, setMessage] = useState('')
  const [restockTarget, setRestockTarget] = useState(null)

  const remaining = items.filter((item) => !item.checked)
  const checked = items.filter((item) => item.checked)
  const nameSuggestions = useMemo(() => {
    const names = new Set([...Object.keys(history), ...pantryItems.map((item) => item.name)])
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [history, pantryItems])

  function handleAdd(event) {
    event.preventDefault()
    const name = text.trim().slice(0, MAX_NAME_LENGTH)
    if (!name) return
    const { added } = addItems([{ name, amount: '' }])
    setMessage(added > 0 ? `「${name}」を追加しました` : `「${name}」はすでにリストにあります`)
    setText('')
  }

  function handleRestockSubmit(data) {
    addItem(data)
    removeItem(restockTarget.id)
    setMessage(`「${data.name}」を在庫に追加しました`)
    setRestockTarget(null)
  }

  function handleClearChecked() {
    if (window.confirm(`購入済みの${checked.length}品を、在庫に入れずにリストから消します。よろしいですか？`)) {
      clearChecked()
      setMessage('購入済みをリストから消しました')
    }
  }

  return (
    <section className="screen">
      <h2 className="screen__title">
        買い物
        {items.length > 0 && (
          <span className="screen__count">
            あと{remaining.length}品{checked.length > 0 && `・購入済み${checked.length}品`}
          </span>
        )}
      </h2>

      <form className="inline-input shopping-add" onSubmit={handleAdd}>
        <input
          type="text"
          list="shopping-names"
          autoComplete="off"
          aria-label="買う物の名前"
          placeholder="買う物を追加（例：牛乳）"
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setMessage('')
          }}
        />
        <datalist id="shopping-names">
          {nameSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <button type="submit" className="button button--primary" disabled={!text.trim()}>
          追加
        </button>
      </form>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}

      {items.length === 0 ? (
        <p className="placeholder">
          買い物リストは空です。献立の「足りない食材を買い物リストへ」か、上の入力欄から追加できます。
        </p>
      ) : (
        <>
          <ul className="shopping-list">
            {[...remaining, ...checked].map((item) => (
              <ShoppingRow
                key={item.id}
                item={item}
                onToggle={toggleChecked}
                onRestock={setRestockTarget}
                onDelete={removeItem}
              />
            ))}
          </ul>
          {checked.length > 0 && (
            <div className="shopping-footer">
              <p className="help-text">購入済みは「在庫へ」で数量・期限を入れて在庫に移せます。</p>
              <button type="button" className="button" onClick={handleClearChecked}>
                購入済みを消す
              </button>
            </div>
          )}
        </>
      )}

      {restockTarget && (
        <div className="sheet-backdrop">
          <div className="sheet" role="dialog" aria-modal="true" aria-label="在庫に追加">
            <h3 className="sheet__title">在庫に追加</h3>
            <ItemForm
              key={restockTarget.id}
              mode="restock"
              initialItem={buildRestockItem(restockTarget, history)}
              history={history}
              nameSuggestions={nameSuggestions}
              onSubmit={handleRestockSubmit}
              onCancel={() => setRestockTarget(null)}
            />
          </div>
        </div>
      )}
    </section>
  )
}
