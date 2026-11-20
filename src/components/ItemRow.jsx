import { getCategoryInfo, getItemCategory } from '../utils/category.js'
import { formatShortDate } from '../utils/date.js'
import { getExpiryStatus } from '../utils/expiryStatus.js'

export default function ItemRow({ item, onEdit, onDecrement, onTogglePriority, onDelete }) {
  const { status, label } = getExpiryStatus(item.expiry)
  const isPriority = item.priority === true
  const category = getCategoryInfo(getItemCategory(item))

  return (
    <li className={`item-row item-row--${status}${isPriority ? ' item-row--priority' : ''}`}>
      <button type="button" className="item-row__main" onClick={() => onEdit(item)}>
        <span className={`category-icon category-icon--${category.key}`} title={category.label}>
          <span aria-hidden="true">{category.icon}</span>
          <span className="visually-hidden">{category.label}</span>
        </span>
        <span className="item-row__body">
          <span className="item-row__top">
            <span className="item-row__name">{item.name}</span>
            <span className={`expiry-badge expiry-badge--${status}`}>
              {item.expiry ? `${formatShortDate(item.expiry)}・${label}` : label}
            </span>
          </span>
          <span className="item-row__meta">
            {isPriority && <span className="priority-badge">最優先</span>}
            {item.quantity}
            {item.unit}・{item.location}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={isPriority ? 'item-row__action item-row__priority item-row__priority--on' : 'item-row__action item-row__priority'}
        aria-label={isPriority ? `${item.name}の最優先を外す` : `${item.name}を最優先にする`}
        aria-pressed={isPriority}
        onClick={() => onTogglePriority(item)}
      >
        {isPriority ? '★' : '☆'}
      </button>
      <button
        type="button"
        className="item-row__action item-row__decrement"
        aria-label={`${item.name}を1減らす`}
        onClick={() => onDecrement(item)}
      >
        −
      </button>
      <button
        type="button"
        className="item-row__action item-row__delete"
        aria-label={`${item.name}を削除`}
        onClick={() => onDelete(item)}
      >
        🗑
      </button>
    </li>
  )
}
