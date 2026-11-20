import { useMemo, useState } from 'react'
import ItemForm from '../components/ItemForm.jsx'
import ItemRow from '../components/ItemRow.jsx'
import { usePantryItems } from '../hooks/usePantryItems.js'
import { compareByExpiry } from '../utils/expiryStatus.js'

export default function PantryScreen() {
  const { items, history, addItem, updateItem, removeItem } = usePantryItems()
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const sortedItems = useMemo(() => [...items].sort(compareByExpiry), [items])
  const nameSuggestions = useMemo(() => {
    const names = new Set([...Object.keys(history), ...items.map((item) => item.name)])
    return [...names].sort((a, b) => a.localeCompare(b, 'ja'))
  }, [history, items])

  function handleDecrement(item) {
    const nextQuantity = Math.max(0, Math.round((item.quantity - 1) * 100) / 100)
    if (nextQuantity > 0) {
      updateItem(item.id, { quantity: nextQuantity })
      return
    }
    if (window.confirm(`「${item.name}」が0になります。削除しますか？`)) {
      removeItem(item.id)
    } else {
      updateItem(item.id, { quantity: 0 })
    }
  }

  function handleEditSubmit(data) {
    updateItem(editingItem.id, data)
    setEditingItem(null)
  }

  function handleEditDelete() {
    if (window.confirm(`「${editingItem.name}」を削除しますか？`)) {
      removeItem(editingItem.id)
      setEditingItem(null)
    }
  }

  return (
    <section className="screen">
      <div className="screen__header">
        <h2 className="screen__title">
          在庫<span className="screen__count">{items.length}品</span>
        </h2>
        {!isAdding && (
          <button type="button" className="button button--primary" onClick={() => setIsAdding(true)}>
            ＋ 追加
          </button>
        )}
      </div>

      {isAdding && (
        <div className="panel">
          <ItemForm
            mode="add"
            history={history}
            nameSuggestions={nameSuggestions}
            onSubmit={addItem}
            onCancel={() => setIsAdding(false)}
          />
        </div>
      )}

      {sortedItems.length === 0 ? (
        <p className="placeholder">まだ食材がありません。「＋ 追加」から登録してください。</p>
      ) : (
        <ul className="item-list">
          {sortedItems.map((item) => (
            <ItemRow key={item.id} item={item} onEdit={setEditingItem} onDecrement={handleDecrement} />
          ))}
        </ul>
      )}

      {editingItem && (
        <div className="sheet-backdrop">
          <div className="sheet" role="dialog" aria-modal="true" aria-label="食材の編集">
            <h3 className="sheet__title">食材の編集</h3>
            <ItemForm
              key={editingItem.id}
              mode="edit"
              initialItem={editingItem}
              history={history}
              nameSuggestions={nameSuggestions}
              onSubmit={handleEditSubmit}
              onCancel={() => setEditingItem(null)}
              onDelete={handleEditDelete}
            />
          </div>
        </div>
      )}
    </section>
  )
}
