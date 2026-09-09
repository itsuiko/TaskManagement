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

export function TaskCard({ task }: { task: Task }) {
  return (
    <li className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
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
