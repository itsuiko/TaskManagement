import { useEffect, useRef, useState } from 'react'
import { createTask } from '../api'
import { PRIORITY_LABELS, type Priority, type Status } from '../types'

/**
 * S-02 タスク作成モーダル（docs/screen-design.md 2章）。
 *
 * HTML 標準の `<dialog>` を使う。Esc で閉じる・背後の操作を遮る・フォーカスを内側に
 * 閉じ込める、が自前のコードなしで付いてくる。prototype/index.html も `<dialog>` で
 * 作ってあり、第07回の「外部ライブラリを足さず標準の API で済ませる」方針の踏襲。
 *
 * **作成専用にしてある。** F-03（編集）と共用できそうに見えるが、編集の API はまだ無い。
 * 使う先が決まらないうちに共通化しない。
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

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority | ''>('')

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
    if (title.trim() === '') {
      setTitleError('タイトルを入力してください。')
      setSaveError(null)
      return
    }
    setTitleError(null)
    setSaveError(null)
    setSaving(true)

    try {
      await createTask({
        title: title.trim(),
        // 未入力は null で送る。空文字だと「空文字が入力された」ことになってしまう。
        description: description.trim() === '' ? null : description,
        dueDate: dueDate === '' ? null : dueDate,
        priority: priority === '' ? null : priority,
        status,
      })
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
          <div>
            <label htmlFor="f-title" className="mb-1 block text-sm font-medium text-slate-700">
              タイトル <span className="text-rose-600">＊</span>
            </label>
            <input
              id="f-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              autoComplete="off"
              autoFocus
              aria-invalid={titleError !== null}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
            {titleError && (
              <p role="alert" className="mt-1 text-sm text-rose-700">
                {titleError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="f-description" className="mb-1 block text-sm font-medium text-slate-700">
              説明文
            </label>
            <textarea
              id="f-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="f-due-date" className="mb-1 block text-sm font-medium text-slate-700">
                期限
              </label>
              <input
                id="f-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="f-priority" className="mb-1 block text-sm font-medium text-slate-700">
                優先度
              </label>
              <select
                id="f-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority | '')}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
              >
                <option value="">未指定</option>
                <option value="high">{PRIORITY_LABELS.high}</option>
                <option value="medium">{PRIORITY_LABELS.medium}</option>
                <option value="low">{PRIORITY_LABELS.low}</option>
              </select>
            </div>
          </div>

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
