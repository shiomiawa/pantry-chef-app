import { useState } from 'react'
import { MAX_SAVED_RECIPES } from '../hooks/useSavedRecipes.js'
import { RECIPE_GENRES, getGenreInfo } from '../utils/cuisine.js'
import { namesMatch } from '../utils/names.js'

function formatDate(iso) {
  const date = new Date(iso)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function SavedRecipeCard({ recipe, stockNames, onRemove, onChangeGenre, onAddToShopping }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const genre = getGenreInfo(recipe.genre)
  const inStock = (name) => stockNames.some((stockName) => namesMatch(stockName, name))
  // 保存したときではなく、今の在庫と比べる
  const lacking = recipe.ingredients.filter((ingredient) => !inStock(ingredient.name))

  function handleAddToShopping() {
    const { added, skipped } = onAddToShopping(lacking, recipe.title)
    setNotice(
      added > 0
        ? `${added}品を買い物リストに追加しました${skipped > 0 ? `（${skipped}品はすでにリストにあります）` : ''}`
        : 'すべて買い物リストに入っています',
    )
  }

  function handleRemove() {
    if (window.confirm(`「${recipe.title}」を保存したレシピから削除しますか？`)) {
      onRemove(recipe.id)
    }
  }

  return (
    <li className="saved-recipe">
      <div className="saved-recipe__header">
        <button
          type="button"
          className="saved-recipe__toggle"
          aria-expanded={isOpen}
          onClick={() => setIsOpen((open) => !open)}
        >
          <span className="saved-recipe__icon" aria-hidden="true">
            {genre.icon}
          </span>
          <span className="saved-recipe__title">{recipe.title}</span>
          <span className="saved-recipe__date">{formatDate(recipe.savedAt)}</span>
          <span className="saved-recipe__chevron" aria-hidden="true">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>
        <button
          type="button"
          className="item-row__action saved-recipe__delete"
          aria-label={`「${recipe.title}」を削除`}
          onClick={handleRemove}
        >
          🗑
        </button>
      </div>

      {isOpen && (
        <div className="saved-recipe__body">
          <label className="saved-recipe__genre">
            ジャンル
            <select className="select" value={recipe.genre} onChange={(event) => onChangeGenre(recipe.id, event.target.value)}>
              {RECIPE_GENRES.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </label>

          <h4 className="menu-card__heading">材料</h4>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`}>
                {inStock(ingredient.name) && <span className="stock-badge">在庫あり</span>}
                <span className="ingredient-list__name">{ingredient.name}</span>
                {ingredient.amount && <span className="ingredient-list__amount">{ingredient.amount}</span>}
              </li>
            ))}
          </ul>
          {lacking.length > 0 ? (
            <button type="button" className="button menu-card__shopping" onClick={handleAddToShopping}>
              🛒 今の在庫にない材料を買い物リストへ（{lacking.length}品）
            </button>
          ) : (
            <p className="menu-card__ok">今の在庫で作れます</p>
          )}
          {notice && (
            <p className="form-message" role="status">
              {notice}
            </p>
          )}

          <h4 className="menu-card__heading">作り方</h4>
          <ol className="menu-card__steps">
            {recipe.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </li>
  )
}

export default function SavedRecipeList({ recipes, stockNames, onRemove, onChangeGenre, onAddToShopping }) {
  const [filter, setFilter] = useState('all')
  const visible = filter === 'all' ? recipes : recipes.filter((recipe) => recipe.genre === filter)
  const genresInUse = RECIPE_GENRES.filter((genre) => recipes.some((recipe) => recipe.genre === genre.key))

  if (recipes.length === 0) {
    return (
      <p className="placeholder">
        保存したレシピはまだありません。提案のカードの「☆ 保存」で、{MAX_SAVED_RECIPES}件まで保存できます。
      </p>
    )
  }

  return (
    <div>
      <p className="help-text">
        {recipes.length}／{MAX_SAVED_RECIPES}件。タップすると材料と作り方が開きます。
      </p>
      <div className="chip-row recipe-filter" role="group" aria-label="ジャンルで絞り込み">
        <button
          type="button"
          className={filter === 'all' ? 'chip chip--selected' : 'chip'}
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          すべて {recipes.length}
        </button>
        {genresInUse.map((genre) => (
          <button
            key={genre.key}
            type="button"
            className={filter === genre.key ? 'chip chip--selected' : 'chip'}
            aria-pressed={filter === genre.key}
            onClick={() => setFilter(genre.key)}
          >
            <span className="chip__icon" aria-hidden="true">
              {genre.icon}
            </span>
            {genre.label} {recipes.filter((recipe) => recipe.genre === genre.key).length}
          </button>
        ))}
      </div>
      <ul className="saved-recipe-list">
        {visible.map((recipe) => (
          <SavedRecipeCard
            key={recipe.id}
            recipe={recipe}
            stockNames={stockNames}
            onRemove={onRemove}
            onChangeGenre={onChangeGenre}
            onAddToShopping={onAddToShopping}
          />
        ))}
      </ul>
    </div>
  )
}
