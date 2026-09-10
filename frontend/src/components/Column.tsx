import type { Task } from '../types'
import { TaskCard } from './TaskCard'

/**
 * ボードの 1 列（未着手 / 作業中 / 完了）。
 *
 * 列に属するカードは `sortOrder` の昇順で並べる。`GET /api/tasks` は
 * status 昇順 → sortOrder 昇順で返すため絞り込んだ時点で既に並んでいるが、
 * 並び順は API の実装ではなく画面の責任として、ここで明示しておく。
 */
export function Column({
  label,
  tasks,
  onAddClick,
}: {
  label: string
  tasks: Task[]
  onAddClick: () => void
}) {
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

      {/*
        F-02「各列に『カードを追加』する操作を用意する」。3 列すべてに置く
        （S-01 の絵のとおり。未着手だけに置くと、作業中や完了に直接足せなくなる）。
        列の末尾に置いているのは、作成されたカードが出てくる位置と揃えるため。
      */}
      <button
        type="button"
        onClick={onAddClick}
        className="mt-2 rounded-lg px-2 py-2 text-left text-sm text-slate-500 hover:bg-slate-200 hover:text-slate-800"
      >
        ＋ カードを追加
      </button>
    </section>
  )
}
