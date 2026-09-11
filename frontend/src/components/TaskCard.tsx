import { useState } from 'react'
import { PRIORITY_LABELS, type Priority, type Task } from '../types'

/**
 * 優先度の色分け（F-08「優先度が設定されている場合は、色やラベルで区別できる」）。
 * 色だけに頼らず「高 / 中 / 低」の文字も併記する。色の違いが見えない場合でも
 * 区別できるようにするため。
 */
const PRIORITY_STYLES: Record<Priority, string> = {
  high: 'bg-rose-100 text-rose-800 ring-rose-200',
  medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  low: 'bg-sky-100 text-sky-800 ring-sky-200',
}

/**
 * 期限の表示形式。
 *
 * バックエンドからは "2026-09-12" の形で届く。`new Date()` を通すと
 * タイムゾーンの解釈が入って日付が 1 日ずれることがあるため、文字列のまま置換する。
 */
function formatDueDate(dueDate: string): string {
  return dueDate.replaceAll('-', '/')
}

/**
 * ボードの 1 枚のカード。
 *
 * **クリックで編集（F-03）、ドラッグで列の移動（F-05）。** どちらも prototype/index.html と
 * 同じ形にしてある——`draggable` と `tabIndex` を持つ 1 つの要素が、click と keydown と
 * dragstart を受ける。外部ライブラリは使わない（第07回の方針）。
 *
 * **`<button>` で包んでいない。** ボタンにすると中の `<p>` が置けず、ドラッグの扱いも
 * ブラウザによって変わる。代わりに `role="button"` と `tabIndex` を付けて、
 * キーボードでも開けるようにしている（Enter と Space。プロトタイプと同じ）。
 */
export function TaskCard({ task, onOpen }: { task: Task; onOpen: () => void }) {
  /** 自分がドラッグされている最中か。掴んでいるカードを薄くするだけに使う */
  const [dragging, setDragging] = useState(false)

  return (
    <li
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${task.title} を編集`}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          // Space は既定だと画面を下にスクロールさせるので止める
          event.preventDefault()
          onOpen()
        }
      }}
      onDragStart={(event) => {
        // 運ぶのは id だけ。中身は画面側が既に持っている
        event.dataTransfer.setData('text/plain', String(task.id))
        event.dataTransfer.effectAllowed = 'move'
        setDragging(true)
      }}
      onDragEnd={() => setDragging(false)}
      className={`cursor-grab rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 hover:ring-sky-300 focus:ring-2 focus:ring-sky-500 focus:outline-none ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <p className="font-medium break-words text-slate-900">{task.title}</p>

      {(task.priority || task.dueDate) && (
        <div className="mt-2 flex items-center gap-2 text-xs">
          {task.priority && (
            <span
              className={`rounded px-1.5 py-0.5 ring-1 ring-inset ${PRIORITY_STYLES[task.priority]}`}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {task.dueDate && (
            <span className="text-slate-500">{formatDueDate(task.dueDate)}</span>
          )}
        </div>
      )}
    </li>
  )
}
