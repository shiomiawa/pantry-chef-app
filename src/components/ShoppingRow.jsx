export default function ShoppingRow({ item, onToggle, onRestock, onDelete }) {
  return (
    <li className={item.checked ? 'shopping-row shopping-row--checked' : 'shopping-row'}>
      <label className="shopping-row__main">
        <input type="checkbox" className="visually-hidden" checked={item.checked} onChange={() => onToggle(item.id)} />
        <span className="shopping-row__check" aria-hidden="true">
          {item.checked ? '✓' : ''}
        </span>
        <span className="shopping-row__body">
          <span className="shopping-row__name">
            {item.name}
            {item.amount && <span className="shopping-row__amount">{item.amount}</span>}
          </span>
          {item.from && <span className="shopping-row__from">{item.from}用</span>}
        </span>
      </label>
      {item.checked && (
        <button type="button" className="button shopping-row__restock" onClick={() => onRestock(item)}>
          在庫へ
        </button>
      )}
      <button
        type="button"
        className="item-row__action shopping-row__delete"
        aria-label={`${item.name}をリストから削除`}
        onClick={() => onDelete(item.id)}
      >
        🗑
      </button>
    </li>
  )
}
