import { useEffect, useState } from 'react'
import { fetchTasks, updateTaskStatus } from './api'
import { Column } from './components/Column'
import { TaskCreateModal } from './components/TaskCreateModal'
import { TaskDeleteDialog } from './components/TaskDeleteDialog'
import { TaskEditModal } from './components/TaskEditModal'
import { COLUMNS, type Status, type Task } from './types'

/**
 * 読み込みの状態。
 *
 * 「読み込み中」「取得できた」「失敗した」を 1 つの値で表す。
 * tasks と error を別々の変数に持つと、両方が入った状態や両方とも空の状態を
 * 型の上で作れてしまい、「失敗しているのにカードが残っている」画面が起こりうる。
 */
type LoadState =
  | { phase: 'loading' }
  | { phase: 'loaded'; tasks: Task[] }
  | { phase: 'failed'; message: string }

export default function App() {
  const [state, setState] = useState<LoadState>({ phase: 'loading' })

  /**
   * 作成モーダルを開いている列。`null` なら閉じている。
   *
   * 「開いているか」と「どの列か」を別々に持たない。真偽値と列を分けて持つと、
   * 「開いているのに列が決まっていない」状態を型の上で作れてしまう。
   */
  const [addingTo, setAddingTo] = useState<Status | null>(null)

  /** 編集モーダルで開いているカード。`null` なら閉じている（考え方は addingTo と同じ） */
  const [editing, setEditing] = useState<Task | null>(null)

  /**
   * 削除の確認ダイアログで開いているカード。`null` なら閉じている。
   *
   * **`editing` と同時に値が入ることはない。** 削除を押した時点で編集を閉じる——
   * `<dialog>` を2枚重ねて開くと、上を閉じたときに下が残り、消したはずのカードの
   * 編集画面が出てくる。
   */
  const [deleting, setDeleting] = useState<Task | null>(null)

  /** 移動に失敗したときの文言。カードは元の列に戻したうえで、これを出す */
  const [moveError, setMoveError] = useState<string | null>(null)

  useEffect(() => {
    // 開発中は React が useEffect を 2 回実行する（StrictMode）。
    // 後から届いた古い応答で新しい結果を上書きしないよう、破棄の印を持つ。
    let cancelled = false

    fetchTasks()
      .then((tasks) => {
        if (!cancelled) setState({ phase: 'loaded', tasks })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : String(error)
        setState({ phase: 'failed', message })
      })

    return () => {
      cancelled = true
    }
  }, [])

  /**
   * 一覧を取り直す。登録・更新・移動のあとに呼ぶ。
   *
   * 返ってきた 1 件を手元の配列に足す（差し替える）方法もあるが、取り直す方を選んだ。
   * サーバーが決めた並び順をそのまま受け取れるので、画面側に「末尾に足す」処理を
   * 持たずに済む（同じ判断を 2 か所に書かない）。
   *
   * **`phase` を `loading` に戻さない。** 戻すと保存のたびに 3 列が消えて
   * 「読み込み中…」が一瞬出る。取得できるまで今の内容を残しておく。
   *
   * 取り直しに失敗したときの文言に `done` を挟むのは、**保存そのものは成功している**ことを
   * 伝えるため。伝わらないと、もう一度同じ操作をして二重に登録・更新してしまう。
   */
  async function reload(done: string) {
    try {
      const tasks = await fetchTasks()
      setState({ phase: 'loaded', tasks })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      setState({ phase: 'failed', message: `${done}が、一覧を取得できませんでした。${message}` })
    }
  }

  /**
   * カードを別の列へ移す（F-05）。列にドロップされたときに呼ばれる。
   *
   * **同じ列に落ちたときは通信しない。** サーバー側も状態が変わらなければ何もしないが、
   * 通信そのものを起こさない方が速く、失敗する機会も増やさない。
   *
   * **成功しても失敗しても一覧を取り直す。** 失敗したときに取り直すのは、画面を
   * サーバーの状態に戻すため——カードが元の列に戻り、エラーだけが残る。
   * F-07「保存に失敗した場合は、画面上にエラーを表示する（成功したように見せてはならない）」。
   */
  async function handleMove(taskId: number, status: Status) {
    if (state.phase !== 'loaded') return

    const task = state.tasks.find((t) => t.id === taskId)
    if (!task || task.status === status) return

    setMoveError(null)
    try {
      await updateTaskStatus(taskId, status)
      await reload('移動しました')
    } catch (error: unknown) {
      setMoveError(error instanceof Error ? error.message : String(error))
      // 画面をサーバーの状態に合わせ直す。ここで取り直さないと、
      // 失敗したのにカードが移動先に居座る。
      await reload('移動できませんでした')
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-lg font-bold text-slate-900">TaskManagement</h1>
      </header>

      <main className="p-6">
        {state.phase === 'loading' && (
          <p className="text-sm text-slate-500">読み込み中…</p>
        )}

        {/*
          F-01「取得に失敗した場合は、画面を白紙にせずエラーを表示する」。
          非機能要件（requirements.md 6章）の「保存の失敗を成功したように見せない」と
          同じ考え方で、失敗を黙って隠さない。
        */}
        {state.phase === 'failed' && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
          >
            <p className="font-semibold">タスクを表示できませんでした</p>
            <p className="mt-1">{state.message}</p>
          </div>
        )}

        {state.phase === 'loaded' && (
          <>
            {/* 移動の失敗。カードは既に元の列へ戻っているので、理由だけをここに出す */}
            {moveError && (
              <div
                role="alert"
                className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
              >
                <p>
                  <span className="font-semibold">カードを移動できませんでした。</span> {moveError}
                </p>
                <button
                  type="button"
                  onClick={() => setMoveError(null)}
                  aria-label="このメッセージを閉じる"
                  className="rounded px-2 leading-none text-rose-400 hover:bg-rose-100 hover:text-rose-700"
                >
                  ×
                </button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              {COLUMNS.map(({ status, label }) => (
                <Column
                  key={status}
                  label={label}
                  tasks={state.tasks.filter((task) => task.status === status)}
                  onAddClick={() => setAddingTo(status)}
                  onTaskOpen={setEditing}
                  onTaskDrop={(taskId) => handleMove(taskId, status)}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/*
        開いている間だけ描画する。閉じるとコンポーネントごと消えるので、
        入力内容を消す処理を書かなくても次に開いたときは空になる。
      */}
      {addingTo && (
        <TaskCreateModal
          status={addingTo}
          columnLabel={COLUMNS.find((c) => c.status === addingTo)!.label}
          onCreated={() => reload('登録は完了しました')}
          onClose={() => setAddingTo(null)}
        />
      )}

      {editing && (
        <TaskEditModal
          task={editing}
          onSaved={() => reload('保存は完了しました')}
          onDeleteClick={() => {
            // 編集を閉じてから確認を開く。順番が逆だと2枚重なる
            setDeleting(editing)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}

      {deleting && (
        <TaskDeleteDialog
          task={deleting}
          onDeleted={() => reload('削除は完了しました')}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
