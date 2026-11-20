import { useId, useMemo, useState } from 'react'
import { getCategoryInfo } from '../utils/category.js'
import { buildTemplateCsv, decodeCsvBuffer, parseCsv } from '../utils/csv.js'
import { todayString } from '../utils/date.js'
import { downloadTextFile } from '../utils/download.js'
import { FIELDS, MAX_IMPORT_ROWS, buildImportPreview, guessMapping } from '../utils/importItems.js'

const MAX_FILE_BYTES = 1024 * 1024
const PREVIEW_ROWS = 5
const MAX_NOTICES = 10

export default function CsvImportPanel({ onImport }) {
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const inputId = useId()

  const result = useMemo(
    () => (preview ? buildImportPreview(preview.dataRows, preview.mapping) : null),
    [preview],
  )
  const hasNameColumn = preview?.mapping.includes('name') ?? false

  function handleDownloadTemplate() {
    // Excel で文字化けしないよう、先頭に BOM を付けた UTF-8 で出す
    downloadTextFile('pantry-chef-template.csv', `﻿${buildTemplateCsv(todayString())}`, 'text/csv;charset=utf-8')
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = '' // 同じファイルを選び直しても反応するようにする
    if (!file) return

    setError('')
    setMessage('')
    setPreview(null)

    if (file.size > MAX_FILE_BYTES) {
      setError('ファイルが大きすぎます（1MBまで）')
      return
    }

    try {
      const { text, encoding } = decodeCsvBuffer(await file.arrayBuffer())
      const rows = parseCsv(text)
      if (rows.length < 2) {
        setError('見出しの行と、1行以上のデータが必要です')
        return
      }
      const [headers, ...dataRows] = rows
      if (dataRows.length > MAX_IMPORT_ROWS) {
        setError(`一度に取り込めるのは${MAX_IMPORT_ROWS}行までです（このファイルは${dataRows.length}行）`)
        return
      }
      setPreview({ fileName: file.name, encoding, headers, dataRows, mapping: guessMapping(headers) })
    } catch {
      setError('ファイルを読み込めませんでした')
    }
  }

  function handleMappingChange(columnIndex, fieldKey) {
    setPreview((prev) => ({
      ...prev,
      // 同じ項目を2つの列に割り当てないよう、ほかの列の同じ項目は外す
      mapping: prev.mapping.map((key, index) => {
        if (index === columnIndex) return fieldKey
        return fieldKey && key === fieldKey ? '' : key
      }),
    }))
  }

  function handleImport() {
    onImport(result.items)
    setMessage(`${result.items.length}件を在庫に追加しました`)
    setPreview(null)
  }

  const notices = result ? [...result.skipped.map((s) => ({ line: s.line, text: `${s.reason}のため飛ばします` })), ...result.warnings.map((w) => ({ line: w.line, text: w.message }))].sort((a, b) => a.line - b.line) : []

  return (
    <div className="panel">
      <h3 className="panel__title">CSV取り込み（初回用）</h3>
      <p className="help-text">
        1行目は見出し（食材名,数量,単位,期限,保管場所）。期限は「2026-12-31」の形式で、空でも可。保管場所は
        冷蔵・冷凍・常温 のどれか。ジャンルは名前から自動で判断します（「ジャンル」列を足して指定も可）。取り込んだ食材は、今の在庫に追加されます。
      </p>

      <div className="button-row">
        <button type="button" className="button" onClick={handleDownloadTemplate}>
          CSVのひな形をダウンロード
        </button>
        <label htmlFor={inputId} className="button button--primary file-button">
          CSVファイルを選ぶ
        </label>
        <input id={inputId} type="file" accept=".csv,text/csv" className="visually-hidden" onChange={handleFileChange} />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-message" role="status">{message}</p>}

      {preview && result && (
        <div className="import-preview">
          <p className="help-text">
            {preview.fileName}（{preview.encoding}）・データ {preview.dataRows.length}行
          </p>

          <h4 className="import-preview__title">見出しの対応</h4>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>CSVの見出し</th>
                  <th>アプリの項目</th>
                  <th>1行目の値</th>
                </tr>
              </thead>
              <tbody>
                {preview.headers.map((header, index) => (
                  <tr key={index}>
                    <td>{header || '（空）'}</td>
                    <td>
                      <select
                        aria-label={`「${header}」の取り込み先`}
                        value={preview.mapping[index]}
                        onChange={(event) => handleMappingChange(index, event.target.value)}
                      >
                        <option value="">取り込まない</option>
                        {FIELDS.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{preview.dataRows[0]?.[index] ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!hasNameColumn && <p className="form-error">「食材名」に当たる列を選んでください</p>}

          {hasNameColumn && (
            <>
              <h4 className="import-preview__title">
                取り込み結果の見本（最初の{Math.min(PREVIEW_ROWS, result.items.length)}件）
              </h4>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {FIELDS.map((field) => (
                        <th key={field.key}>{field.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.slice(0, PREVIEW_ROWS).map((item, index) => (
                      <tr key={index}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.expiry || '期限なし'}</td>
                        <td>{item.location}</td>
                        <td>
                          {getCategoryInfo(item.category).icon} {getCategoryInfo(item.category).label}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="import-preview__summary">
                取り込む：<strong>{result.items.length}件</strong>
                {result.skipped.length > 0 && `／飛ばす：${result.skipped.length}件`}
              </p>

              {notices.length > 0 && (
                <ul className="notice-list">
                  {notices.slice(0, MAX_NOTICES).map((notice, index) => (
                    <li key={index}>
                      {notice.line}行目：{notice.text}
                    </li>
                  ))}
                  {notices.length > MAX_NOTICES && <li>ほか{notices.length - MAX_NOTICES}件</li>}
                </ul>
              )}
            </>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="button button--primary"
              disabled={!hasNameColumn || result.items.length === 0}
              onClick={handleImport}
            >
              {result.items.length}件を取り込む
            </button>
            <button type="button" className="button" onClick={() => setPreview(null)}>
              やめる
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
