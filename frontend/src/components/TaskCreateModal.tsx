import { useEffect, useRef, useState } from 'react'
import { createTask } from '../api'
import { type Status } from '../types'
import { toRequestFields, type TaskFormValues } from '../taskForm'
import { TaskFormFields } from './TaskFormFields'

/**
 * S-02 タスク作成モーダル（docs/screen-design.md 2章）。
 *
 * HTML 標準の `<dialog>` を使う。Esc で閉じる・背後の操作を遮る・フォーカスを内側に
 * 閉じ込める、が自前のコードなしで付いてくる。prototype/index.html も `<dialog>` で
 * 作ってあり、第07回の「外部ライブラリを足さず標準の API で済ませる」方針の踏襲。
 *
 * **入力欄は `TaskFormFields` と共有し、送信だけをここが持つ。** 第12回は編集の API が
 * まだ無かったため作成専用にしていた。編集（S-03）ができたので切り出した。
 *
 * このコンポーネントは開いている間だけ存在する（App が条件付きで描画する）。
 * 閉じるたびに消えるので、入力内容を消す処理を自分で書く必要がない。
 */
export function TaskCreateModal({
  status,
  columnLabel,
  onCreated,
  onClose,
}: {
  /** どの列の「＋ カードを追加」から開かれたか。そのままサーバーに送る */
  status: Status
  /** 見出しに出す列の名前（未着手 / 作業中 / 完了） */
  columnLabel: string
  /** 登録できたときに呼ぶ。App が一覧を取り直す */
  onCreated: () => Promise<void>
  /** 閉じるときに呼ぶ */
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [values, setValues] = useState<TaskFormValues>({
    title: '',
    description: '',
    dueDate: '',
    priority: '',
  })

  /** 入力の誤り（画面側で気づけるもの）。通信する前に出す */
  const [titleError, setTitleError] = useState<string | null>(null)
  /** 通信して失敗したときのエラー */
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // `open` 属性を付けるだけでは背景を遮る表示にならないので、showModal() で開く。
  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return

    // F-02「タイトルが空のまま作成しようとした場合は、作成せずにエラーを表示する」。
    // 空白だけの入力も空として扱う（サーバー側の @NotBlank と揃えてある）。
    if (values.title.trim() === '') {
      setTitleError('タイトルを入力してください。')
      setSaveError(null)
      return
    }
    setTitleError(null)
    setSaveError(null)
    setSaving(true)

    try {
      await createTask({ ...toRequestFields(values), status })
      await onCreated()
      onClose()
    } catch (error: unknown) {
      // UC-01 のフロー7「保存に失敗した場合、エラーを表示し、モーダルは開いたままにする」。
      // ここで閉じると、書いた内容ごと消えて入力し直しになる。
      setSaveError(error instanceof Error ? error.message : String(error))
      setSaving(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      // Esc キーで閉じたときもここに来る（`<dialog>` の標準動作）
      onClose={onClose}
      className="w-[min(32rem,calc(100vw-2rem))] rounded-xl p-0 backdrop:bg-slate-900/50"
    >
      <form onSubmit={handleSubmit}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">
            タスクを追加
            <span className="ml-2 text-sm font-normal text-slate-500">（{columnLabel}）</span>
          </h2>
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
            F-07「保存に失敗した場合は、画面上にエラーを表示する（成功したように見せてはならない）」。
            モーダルを閉じずにここへ出す。
          */}
          {saveError && (
            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {saveError}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
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
