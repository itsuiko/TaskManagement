import { useEffect, useState } from 'react'
import { fetchTasks } from './api'
import { Column } from './components/Column'
import { TaskCreateModal } from './components/TaskCreateModal'
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
   * 一覧を取り直す。登録したあとに呼ぶ。
   *
   * 返ってきた 1 件を手元の配列に足す方法もあるが、取り直す方を選んだ。
   * サーバーが決めた並び順をそのまま受け取れるので、画面側に「末尾に足す」処理を
   * 持たずに済む（同じ判断を 2 か所に書かない）。
   *
   * **`phase` を `loading` に戻さない。** 戻すと保存のたびに 3 列が消えて
   * 「読み込み中…」が一瞬出る。取得できるまで今の内容を残しておく。
   */
  async function reload() {
    try {
      const tasks = await fetchTasks()
      setState({ phase: 'loaded', tasks })
    } catch (error: unknown) {
      // 登録そのものは成功している。それが伝わらないと、もう一度登録して重複させてしまう。
      const message = error instanceof Error ? error.message : String(error)
      setState({ phase: 'failed', message: `登録は完了しましたが、一覧を取得できませんでした。${message}` })
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
          <div className="grid grid-cols-3 gap-4">
            {COLUMNS.map(({ status, label }) => (
              <Column
                key={status}
                label={label}
                tasks={state.tasks.filter((task) => task.status === status)}
                onAddClick={() => setAddingTo(status)}
              />
            ))}
          </div>
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
          onCreated={reload}
          onClose={() => setAddingTo(null)}
        />
      )}
    </div>
  )
}
