import { useEffect, useMemo, useState } from 'react'
import MenuCard from '../components/MenuCard.jsx'
import SavedRecipeList from '../components/SavedRecipeList.jsx'
import WantedFoodsInput from '../components/WantedFoodsInput.jsx'
import { usePantryItems } from '../hooks/usePantryItems.js'
import { MAX_SAVED_RECIPES, useSavedRecipes } from '../hooks/useSavedRecipes.js'
import { useShoppingList } from '../hooks/useShoppingList.js'
import { useSyncState } from '../hooks/useSyncState.js'
import { DATA_REPLACED_EVENT, getSyncCode } from '../sync/syncClient.js'
import {
  DAILY_SUGGEST_LIMIT,
  getTodayCount,
  incrementTodayCount,
  loadDemoCode,
  saveDemoCode,
} from '../utils/demoAccess.js'
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

  // 「提案する」と「保存したレシピ」の切り替え
  const [view, setView] = useState('suggest')
  const { recipes, isSaved, saveRecipe, removeRecipe, updateGenre } = useSavedRecipes()
  // どの案のカードに保存できなかった理由を出すか
  const [saveNotice, setSaveNotice] = useState({ index: -1, text: '' })

  function handleSave(menu, index) {
    const result = saveRecipe(menu)
    setSaveNotice({
      index,
      text:
        result.ok || result.reason === 'duplicate'
          ? ''
          : `${MAX_SAVED_RECIPES}件まで保存できます。不要なレシピを削除してください`,
    })
  }

  const stockNames = useMemo(
    () =>
      [...new Set(items.filter((item) => item.quantity > 0).map((item) => item.name))].sort((a, b) =>
        a.localeCompare(b, 'ja'),
      ),
    [items],
  )
  const stockCount = items.filter((item) => item.quantity > 0).length
  // API費用対策：同期コードを入れた自分の端末はデモコード不要・回数の上限なし。
  // それ以外はデモコードが必要で、1日の回数に上限がある（回数はブラウザ側の目安）
  const isOwner = useSyncState().status !== 'off'
  const [demoCode, setDemoCode] = useState(loadDemoCode)
  const [todayCount, setTodayCount] = useState(getTodayCount)
  const isOverLimit = !isOwner && todayCount >= DAILY_SUGGEST_LIMIT
  const hasAccess = isOwner || demoCode.trim() !== ''
  const canSuggest = !isLoading && hasAccess && !isOverLimit && (stockCount > 0 || wants.length > 0)

  async function handleSuggest() {
    setIsLoading(true)
    setError('')
    try {
      const payload = buildSuggestRequest(
        items,
        { wants, servings, maxMissing: maxMissing === '' ? null : Number(maxMissing), cuisine },
        todayString(),
      )
      const menus = await requestSuggestion(payload, isOwner ? getSyncCode() : demoCode.trim())
      const next = { createdAt: new Date().toISOString(), wants, cuisine, menus }
      setSuggestion(next)
      saveLastSuggestion(next)
      // 数えるのは提案が成功したときだけ（コード違いなどで失敗した回は数えない）
      setTodayCount(incrementTodayCount())
    } catch (suggestError) {
      setError(suggestError.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="screen">
      <h2 className="screen__title">献立</h2>

      <div className="sort-control" role="group" aria-label="表示の切り替え">
        <button
          type="button"
          className={view === 'suggest' ? 'sort-control__button sort-control__button--active' : 'sort-control__button'}
          aria-pressed={view === 'suggest'}
          onClick={() => setView('suggest')}
        >
          提案する
        </button>
        <button
          type="button"
          className={view === 'saved' ? 'sort-control__button sort-control__button--active' : 'sort-control__button'}
          aria-pressed={view === 'saved'}
          onClick={() => setView('saved')}
        >
          保存したレシピ（{recipes.length}）
        </button>
      </div>

      {view === 'saved' && (
        <SavedRecipeList
          recipes={recipes}
          stockNames={stockNames}
          onRemove={removeRecipe}
          onChangeGenre={updateGenre}
          onAddToShopping={addShoppingItems}
        />
      )}

      {view === 'suggest' && (
        <>
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

            {!isOwner && (
              <div className="field">
                <label htmlFor="suggest-demo-code">デモコード（AI提案を試すための合言葉）</label>
                <input
                  id="suggest-demo-code"
                  className="text-input"
                  type="password"
                  autoComplete="off"
                  value={demoCode}
                  onChange={(event) => {
                    setDemoCode(event.target.value)
                    saveDemoCode(event.target.value.trim())
                  }}
                />
              </div>
            )}

            <button
              type="button"
              className="button button--primary suggest-button"
              disabled={!canSuggest}
              onClick={handleSuggest}
            >
              {isLoading ? '考え中…' : '今あるもので提案'}
            </button>
            <p className="help-text suggest-note">提案すると在庫の内容がAIへ送信されます</p>
            <p className="help-text suggest-note">
              {isOwner
                ? `今日の提案：${todayCount}回（同期中の端末は上限なし）`
                : `今日の提案：${todayCount}／${DAILY_SUGGEST_LIMIT}回`}
            </p>
            {isOverLimit && (
              <p className="form-error">今日の提案は{DAILY_SUGGEST_LIMIT}回までです。また明日お試しください</p>
            )}
            {!isOwner && !hasAccess && <p className="help-text">デモコードを入れると提案できます</p>}
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
                  isSaved={isSaved(menu.title)}
                  onSave={(target) => handleSave(target, index)}
                  saveNotice={saveNotice.index === index ? saveNotice.text : ''}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
