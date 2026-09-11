import { useState } from 'react'
import type { Task } from '../types'
import { TaskCard } from './TaskCard'

/**
 * ボードの 1 列（未着手 / 作業中 / 完了）。
 *
 * 列に属するカードは `sortOrder` の昇順で並べる。`GET /api/tasks` は
 * status 昇順 → sortOrder 昇順で返すため絞り込んだ時点で既に並んでいるが、
 * 並び順は API の実装ではなく画面の責任として、ここで明示しておく。
 *
 * **この列はカードの落とし先でもある**（F-05）。落ちてきた id を親へ渡すところまでを持ち、
 * 通信は親（App）が行う。どこに落ちたかを知っているのはこの列だが、
 * 一覧を持っているのは親なので、状態の書き換えを 2 か所に散らさない。
 */
export function Column({
  label,
  tasks,
  onAddClick,
  onTaskOpen,
  onTaskDrop,
}: {
  label: string
  tasks: Task[]
  onAddClick: () => void
  onTaskOpen: (task: Task) => void
  /** カードが落ちてきたときに呼ぶ。渡すのは掴まれていたカードの id */
  onTaskDrop: (taskId: number) => void
}) {
  const sorted = [...tasks].sort((a, b) => a.sortOrder - b.sortOrder)

  /** この列の上にカードが重なっているか。F-05「どこにドロップされるかが視覚的に分かる」 */
  const [over, setOver] = useState(false)

  return (
    <section
      onDragOver={(event) => {
        // **これを止めないとドロップできない。** ブラウザの既定は「受け取らない」で、
        // dragover を打ち消した要素だけが落とし先になる（HTML 標準の決まり）。
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        setOver(true)
      }}
      onDragLeave={(event) => {
        // 中の要素の間を移動しただけでも dragleave は飛んでくる。
        // 列の外へ出たときだけ消したいので、移動先が列の中かどうかを見る。
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOver(false)
        }
      }}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        const taskId = Number(event.dataTransfer.getData('text/plain'))
        if (Number.isNaN(taskId)) return
        onTaskDrop(taskId)
      }}
      className={`flex min-w-0 flex-col rounded-xl p-3 ${
        over ? 'bg-sky-100 ring-2 ring-sky-400' : 'bg-slate-100'
      }`}
    >
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
            <TaskCard key={task.id} task={task} onOpen={() => onTaskOpen(task)} />
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
