import { useEffect, useMemo, useState } from 'react'
import MenuCard from '../components/MenuCard.jsx'
import WantedFoodsInput from '../components/WantedFoodsInput.jsx'
import { usePantryItems } from '../hooks/usePantryItems.js'
import { useShoppingList } from '../hooks/useShoppingList.js'
import { DATA_REPLACED_EVENT } from '../sync/syncClient.js'
import { CUISINES, DEFAULT_CUISINE, getCuisineInfo, loadCuisine, saveCuisine } from '../utils/cuisine.js'
import { todayString } from '../utils/date.js'
import {
  MAX_SUGGEST_ITEMS,
  buildSuggestRequest,
  loadLastSuggestion,
  requestSuggestion,
  saveLastSuggestion,
} from '../utils/suggestRequest.js'

const SERVING_OPTIONS = [1, 2, 3, 4, 5, 6]
const MAX_MISSING_OPTIONS = [
  { value: '', label: '指定なし' },
  { value: '0', label: '0品（今あるものだけ）' },
  { value: '1', label: '1品まで' },
  { value: '2', label: '2品まで' },
  { value: '3', label: '3品まで' },
]

function formatDateTime(iso) {
  const date = new Date(iso)
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`
}

export default function MenuScreen() {
  const { items } = usePantryItems()
  const [wants, setWants] = useState([])
  const [servings, setServings] = useState(2)
  const [maxMissing, setMaxMissing] = useState('')
  const [cuisine, setCuisine] = useState(loadCuisine)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState(loadLastSuggestion)

  // ほかの端末の提案が同期で届いたら表示し直す（スーパーで手順を確認できるように）
  useEffect(() => {
    function reload() {
      setSuggestion(loadLastSuggestion())
    }
    window.addEventListener(DATA_REPLACED_EVENT, reload)
    return () => window.removeEventListener(DATA_REPLACED_EVENT, reload)
  }, [])
  const { addItems: addShoppingItems } = useShoppingList()
  // どの案のカードに「買い物リストへ追加しました」を出すか
  const [shoppingNotice, setShoppingNotice] = useState({ index: -1, text: '' })

  function handleAddToShopping(menu, index) {
    const { added, skipped } = addShoppingItems(menu.missing, menu.title)
    let text = 'すべて買い物リストに入っています'
    if (added > 0) {
      text = `${added}品を買い物リストに追加しました${skipped > 0 ? `（${skipped}品はすでにリストにあります）` : ''}`
    }
    setShoppingNotice({ index, text })
  }

  const stockNames = useMemo(
    () => [...new Set(items.filter((item) => item.quantity > 0).map((item) => item.name))].sort((a, b) => a.localeCompare(b, 'ja')),
    [items],
  )
  const stockCount = items.filter((item) => item.quantity > 0).length
  const canSuggest = !isLoading && (stockCount > 0 || wants.length > 0)

  async function handleSuggest() {
    setIsLoading(true)
    setError('')
    try {
      const payload = buildSuggestRequest(
        items,
        { wants, servings, maxMissing: maxMissing === '' ? null : Number(maxMissing), cuisine },
        todayString(),
      )
      const menus = await requestSuggestion(payload)
      const next = { createdAt: new Date().toISOString(), wants, cuisine, menus }
      setSuggestion(next)
      saveLastSuggestion(next)
    } catch (suggestError) {
      setError(suggestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="screen">
      <h2 className="screen__title">献立</h2>

      <div className="panel suggest-form">
        <WantedFoodsInput wants={wants} onChange={setWants} stockNames={stockNames} />

        <fieldset className="field">
          <legend>料理の種類（もう一度タップで外して「お任せ」に戻ります）</legend>
          <div className="chip-row">
            {CUISINES.map((option) => (
              <label key={option.key} className={cuisine === option.key ? 'chip chip--selected' : 'chip'}>
                <input
                  type="radio"
                  name="suggest-cuisine"
                  value={option.key}
                  checked={cuisine === option.key}
                  onChange={() => {
                    setCuisine(option.key)
                    saveCuisine(option.key)
                  }}
                  // 選んでいる種類をもう一度タップすると、選択を外して「お任せ」に戻す
                  onClick={() => {
                    if (cuisine === option.key && option.key !== DEFAULT_CUISINE) {
                      setCuisine(DEFAULT_CUISINE)
                      saveCuisine(DEFAULT_CUISINE)
                    }
                  }}
                />
                <span className="chip__icon" aria-hidden="true">
                  {option.icon}
                </span>
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="field-row">
          <div className="field">
            <label htmlFor="suggest-servings">人数</label>
            <select
              id="suggest-servings"
              className="select"
              value={servings}
              onChange={(event) => setServings(Number(event.target.value))}
            >
              {SERVING_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}人
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="suggest-max-missing">買い足し</label>
            <select
              id="suggest-max-missing"
              className="select"
              value={maxMissing}
              onChange={(event) => setMaxMissing(event.target.value)}
            >
              {MAX_MISSING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="button" className="button button--primary suggest-button" disabled={!canSuggest} onClick={handleSuggest}>
          {isLoading ? '考え中…' : '今あるもので提案'}
        </button>
        <p className="help-text suggest-note">提案すると在庫の内容がAIへ送信されます</p>
        {stockCount > MAX_SUGGEST_ITEMS && (
          <p className="help-text">
            在庫が{MAX_SUGGEST_ITEMS}品を超えているため、★と期限が近いものから{MAX_SUGGEST_ITEMS}品を送ります
          </p>
        )}
        {stockCount === 0 && wants.length === 0 && (
          <p className="help-text">在庫がありません。在庫を登録するか、今日食べたいものを入れてください</p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>

      {isLoading && (
        <p className="loading" role="status">
          AIが献立を考えています（10〜20秒ほどかかります）…
        </p>
      )}

      {!isLoading && suggestion && (
        <div className="menu-list">
          <p className="help-text">
            {formatDateTime(suggestion.createdAt)} の提案
            {suggestion.cuisine &&
              suggestion.cuisine !== DEFAULT_CUISINE &&
              `・${getCuisineInfo(suggestion.cuisine).icon}${getCuisineInfo(suggestion.cuisine).label}`}
            {suggestion.wants.length > 0 && `（食べたい：${suggestion.wants.join('、')}）`}
          </p>
          {suggestion.menus.map((menu, index) => (
            <MenuCard
              key={`${menu.title}-${index}`}
              menu={menu}
              index={index}
              wants={suggestion.wants}
              onAddToShopping={(target) => handleAddToShopping(target, index)}
              shoppingNotice={shoppingNotice.index === index ? shoppingNotice.text : ''}
            />
          ))}
        </div>
      )}
    </section>
  )
}
