import { getGenreInfo } from '../utils/cuisine.js'
import { findBestMatch } from '../utils/names.js'

function matchesWant(name, wants) {
  const normalize = (value) => value.replace(/[\s　（）()]/g, '')
  return wants.some((want) => normalize(name).includes(normalize(want)) || normalize(want).includes(normalize(name)))
}

// findStock：在庫にある食材なら、その在庫の名前を返す（「足りない食材」のときだけ渡す）
function IngredientList({ items, wants, findStock }) {
  return (
    <ul className="ingredient-list">
      {items.map((item, index) => (
        <li key={`${item.name}-${index}`}>
          {matchesWant(item.name, wants) && <span className="want-badge">食べたい</span>}
          <span className="ingredient-list__name">{item.name}</span>
          {findStock?.(item.name) && <span className="stock-badge">在庫あり（{findStock(item.name)}）</span>}
          {item.amount && <span className="ingredient-list__amount">{item.amount}</span>}
        </li>
      ))}
    </ul>
  )
}

export default function MenuCard({
  menu,
  index,
  wants,
  stockNames = [],
  onAddToShopping,
  shoppingNotice,
  isSaved,
  onSave,
  saveNotice,
}) {
  const genre = menu.genre ? getGenreInfo(menu.genre) : null
  // AIに送らなかった在庫（51品目以降）と重なることがあるので、全在庫と照らし合わせる
  const findStock = (name) => findBestMatch(stockNames, name)
  const toBuy = menu.missing.filter((item) => !findStock(item.name))
  return (
    <article className="menu-card">
      <h3 className="menu-card__title">
        <span className="menu-card__number">案{index + 1}</span>
        {menu.title}
      </h3>
      <div className="menu-card__meta">
        {genre && (
          <span className="menu-card__genre">
            {genre.icon} {genre.label}
          </span>
        )}
        {onSave && (
          <button
            type="button"
            className={isSaved ? 'button menu-card__save menu-card__save--saved' : 'button menu-card__save'}
            aria-pressed={isSaved}
            disabled={isSaved}
            onClick={() => onSave(menu)}
          >
            {isSaved ? '★ 保存済み' : '☆ 保存'}
          </button>
        )}
      </div>
      {saveNotice && (
        <p className="form-error" role="alert">
          {saveNotice}
        </p>
      )}
      {menu.fulfills?.length > 0 && (
        <p className="menu-card__fulfills">
          <span className="want-badge">食べたい</span>
          {menu.fulfills.join('、')}
        </p>
      )}
      {menu.reason && <p className="menu-card__reason">{menu.reason}</p>}

      <h4 className="menu-card__heading">使う在庫</h4>
      {menu.uses.length > 0 ? <IngredientList items={menu.uses} wants={wants} /> : <p className="placeholder">なし</p>}

      <h4 className="menu-card__heading">足りない食材</h4>
      {menu.missing.length > 0 ? (
        <>
          <IngredientList items={menu.missing} wants={wants} findStock={findStock} />
          {onAddToShopping && toBuy.length > 0 && (
            <button
              type="button"
              className="button menu-card__shopping"
              onClick={() => onAddToShopping({ ...menu, missing: toBuy })}
            >
              🛒 足りない食材を買い物リストへ（{toBuy.length}品）
            </button>
          )}
          {shoppingNotice && (
            <p className="form-message" role="status">
              {shoppingNotice}
            </p>
          )}
        </>
      ) : (
        <p className="menu-card__ok">なし（今ある食材で作れます）</p>
      )}

      <h4 className="menu-card__heading">作り方</h4>
      <ol className="menu-card__steps">
        {menu.steps.map((step, stepIndex) => (
          <li key={stepIndex}>{step}</li>
        ))}
      </ol>
    </article>
  )
}
