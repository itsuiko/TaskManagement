import { useEffect, useRef, useState } from 'react'
import { updateTask } from '../api'
import { COLUMNS, type Status, type Task } from '../types'
import { toRequestFields, type TaskFormValues } from '../taskForm'
import { TaskFormFields } from './TaskFormFields'

/**
 * S-03 タスク編集モーダル（docs/screen-design.md 2章）。カードをクリックすると開く。
 *
 * 作成（S-02）との違いは3つだけで、それ以外は `TaskFormFields` を共有している。
 *
 * 1. 既存の値を初期表示する
 * 2. **状態（未着手 / 作業中 / 完了）を選べる**——ドラッグが使えない場面で列を移動する手段
 * 3. 送り先が `PUT /api/tasks/{id}`
 *
 * **フッターの左端に「削除」ボタンを置いている**（F-04）。押すとこのモーダルを閉じて、
 * 削除確認ダイアログ（S-04）に移る。`<dialog>` を2枚重ねて開くと、上を閉じたときに
 * 下が残って「消したはずのカードの編集画面」が出てくるため、先にこちらを閉じる。
 * prototype/index.html も同じ流れ。
 */
export function TaskEditModal({
  task,
  onSaved,
  onDeleteClick,
  onClose,
}: {
  /** 編集するカード。初期値の取り出し元 */
  task: Task
  /** 保存できたときに呼ぶ。App が一覧を取り直す */
  onSaved: () => Promise<void>
  /**
   * 「削除」を押したときに呼ぶ。**確認ダイアログを開くのは App の仕事。**
   * ここは「押された」ことだけを伝える。閉じる側と開く側が別のコンポーネントなので、
   * 両方を知っている App が2枚の出し入れを持つ。
   */
  onDeleteClick: () => void
  /** 閉じるときに呼ぶ */
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  /**
   * 初期値は `task` から入れる。
   *
   * `null`（未設定）を空文字に直しているのは、`<input>` の値が空文字でしか
   * 「何も入っていない」を表せないため。送る直前に `null` へ戻す（`toRequestFields`）。
   *
   * **useState の初期値なので、開いている間に `task` が変わっても入力欄は追従しない。**
   * 打っている途中で一覧の取り直しが走っても、書いた内容が消えないようにするため。
   */
  const [values, setValues] = useState<TaskFormValues>({
    title: task.title,
    description: task.description ?? '',
    dueDate: task.dueDate ?? '',
    priority: task.priority ?? '',
  })
  const [status, setStatus] = useState<Status>(task.status)

  const [titleError, setTitleError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return

    // F-03「タイトルを空にして保存しようとした場合は、保存せずにエラーを表示する」。
    if (values.title.trim() === '') {
      setTitleError('タイトルを入力してください。')
      setSaveError(null)
      return
    }
    setTitleError(null)
    setSaveError(null)
    setSaving(true)

    try {
      // status も必ず送る。省略すると未着手に戻る（docs/api-design.md 2.5）。
      await updateTask(task.id, { ...toRequestFields(values), status })
      await onSaved()
      onClose()
    } catch (error: unknown) {
      // 作成と同じで、失敗したらモーダルを閉じない。閉じると直した内容ごと消える。
      setSaveError(error instanceof Error ? error.message : String(error))
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 backdrop:bg-slate-900/50"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">タスクを編集</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="rounded px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-4 px-5 py-4">
          <TaskFormFields
            values={values}
            onChange={(patch) => setValues({ ...values, ...patch })}
            titleError={titleError}
          />

          {/*
            状態（S-02 には無い項目）。ここから列を移動できるようにしてあるのは、
            ドラッグ＆ドロップがマウスを必要とするため。非機能要件の
            「キーボードだけでタスクの作成・編集・削除ができる」に対応する。
          */}
          <div>
            <label htmlFor="f-status" className="mb-1 block text-sm font-medium text-slate-700">
              状態
            </label>
            <select
              id="f-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              {COLUMNS.map((column) => (
                <option key={column.status} value={column.status}>
                  {column.label}
                </option>
              ))}
            </select>
            {status !== task.status && (
              <p className="mt-1 text-xs text-slate-500">
                保存すると「{COLUMNS.find((c) => c.status === status)!.label}」の末尾に移動します。
              </p>
            )}
          </div>

          {saveError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {saveError}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3">
          {/*
            削除だけ左端に離してある（prototype/index.html と同じ）。保存・キャンセルと
            並べると、押すつもりのないものを押しやすい。取り消せない操作なので距離を取る。
          */}
          <button
            type="button"
            onClick={onDeleteClick}
            className="rounded-lg px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            削除
          </button>

          <span className="flex-1" />

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
