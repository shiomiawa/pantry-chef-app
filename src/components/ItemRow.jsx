import { formatShortDate } from '../utils/date.js'
import { getExpiryStatus } from '../utils/expiryStatus.js'

export default function ItemRow({ item, onEdit, onDecrement }) {
  const { status, label } = getExpiryStatus(item.expiry)

  return (
    <li className={`item-row item-row--${status}`}>
      <button type="button" className="item-row__main" onClick={() => onEdit(item)}>
        <span className="item-row__top">
          <span className="item-row__name">{item.name}</span>
          <span className={`expiry-badge expiry-badge--${status}`}>
            {item.expiry ? `${formatShortDate(item.expiry)}・${label}` : label}
          </span>
        </span>
        <span className="item-row__meta">
          {item.quantity}
          {item.unit}・{item.location}
        </span>
      </button>
      <button
        type="button"
        className="item-row__decrement"
        aria-label={`${item.name}を1減らす`}
        onClick={() => onDecrement(item)}
      >
        −
      </button>
    </li>
  )
}
