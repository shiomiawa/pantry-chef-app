import { useMemo, useState } from 'react'
import ItemForm from '../components/ItemForm.jsx'
import ItemRow from '../components/ItemRow.jsx'
import { usePantryItems } from '../hooks/usePantryItems.js'
import { CATEGORIES, getItemCategory } from '../utils/category.js'
import { compareByExpiry } from '../utils/expiryStatus.js'

// 並び替えの選択は、この端末のローカルストレージに覚えておく
const SORT_KEY = 'pantry-sort'
const SORT_MODES = [
  { key: 'expiry', label: '期限順' },
  { key: 'category', label: 'ジャンル別' },
  { key: 'name', label: '名前順' },
]

function loadSortMode() {
  try {
    const saved = localStorage.getItem(SORT_KEY)
    return SORT_MODES.some((mode) => mode.key === saved) ? saved : 'expiry'
  } catch {
    return 'expiry'
  }
}

function compareByName(a, b) {
  return a.name.localeCompare(b.name, 'ja')
}

// どの並び方でも、最優先（★）の食材はいちばん上にまとめる
function buildSections(items, sortMode) {
  const priorityItems = items.filter((item) => item.priority === true)
  const otherItems = items.filter((item) => item.priority !== true)
  const compare = sortMode === 'name' ? compareByName : compareByExpiry

  if (sortMode !== 'category') {
    return [{ key: 'all', title: '', items: [...priorityItems.sort(compare), ...otherItems.sort(compare)] }]
  }

  // ジャンル別：★ → 肉・魚・野菜・調味料・その他 の順に見出しを付け、各グループの中は期限が近い順
  const sections = []
  if (priorityItems.length > 0) {
    sections.push({ key: 'priority', title: '★ 最優先', items: priorityItems.sort(compareByExpiry) })
  }
  for (const category of CATEGORIES) {
    const groupItems = otherItems.filter((item) => getItemCategory(item) === category.key).sort(compareByExpiry)
    if (groupItems.length > 0) {
      sections.push({ key: category.key, title: `${category.icon} ${category.label}`, items: groupItems })
    }
  }
  return sections
}

export default function PantryScreen() {
  const { items, history, addItem, updateItem, removeItem } = usePantryItems()
  const [isAdding, setIsAdding] = useState(false)
  const [editingItem, setEditingItem] = useState(null)

  const [sortMode, setSortMode] = useState(loadSortMode)
  const sections = useMemo(() => buildSections(items, sortMode), [items, sortMode])

  function handleSortChange(mode) {
    setSortMode(mode)
    try {
      localStorage.setItem(SORT_KEY, mode)
    } catch {
      // 保存できなくても並び替え自体はできる
    }
  }
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

  function handleTogglePriority(item) {
    updateItem(item.id, { priority: item.priority !== true })
  }

  function handleDelete(item) {
    if (window.confirm(`「${item.name}」を削除しますか？`)) {
      removeItem(item.id)
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

      {items.length === 0 ? (
        <p className="placeholder">まだ食材がありません。「＋ 追加」から登録してください。</p>
      ) : (
        <>
          <div className="sort-control" role="group" aria-label="並び替え">
            {SORT_MODES.map((mode) => (
              <button
                key={mode.key}
                type="button"
                className={sortMode === mode.key ? 'sort-control__button sort-control__button--active' : 'sort-control__button'}
                aria-pressed={sortMode === mode.key}
                onClick={() => handleSortChange(mode.key)}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {sections.map((section) => (
            <div key={section.key} className="list-section">
              {section.title && (
                <h3 className="list-section__title">
                  {section.title}
                  <span className="list-section__count">{section.items.length}</span>
                </h3>
              )}
              <ul className="item-list">
                {section.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onEdit={setEditingItem}
                    onDecrement={handleDecrement}
                    onTogglePriority={handleTogglePriority}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </div>
          ))}
        </>
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
