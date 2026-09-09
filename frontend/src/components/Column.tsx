import type { Task } from '../types'
import { TaskCard } from './TaskCard'

/**
 * ボードの 1 列（未着手 / 作業中 / 完了）。
 *
 * 列に属するカードは `sortOrder` の昇順で並べる。`GET /api/tasks` は
 * status 昇順 → sortOrder 昇順で返すため絞り込んだ時点で既に並んでいるが、
 * 並び順は API の実装ではなく画面の責任として、ここで明示しておく。
 */
export function Column({ label, tasks }: { label: string; tasks: Task[] }) {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <section className="flex min-w-0 flex-col rounded-xl bg-slate-100 p-3">
      <h2 className="mb-3 flex items-baseline gap-2 px-1 text-sm font-semibold text-slate-700">
        {label}
        {/* F-01「各列の見出しには、その列に含まれるカードの件数を表示する」 */}
        <span className="text-xs font-normal text-slate-500">({sorted.length})</span>
      </h2>

      {sorted.length === 0 ? (
        <p className="px-1 py-6 text-center text-xs text-slate-400">カードはありません</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sorted.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </ul>
      )}
    </section>
  )
}
