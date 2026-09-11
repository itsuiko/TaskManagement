import { useEffect, useRef, useState } from 'react'
import { deleteTask } from '../api'
import { type Task } from '../types'

/**
 * S-04 削除確認ダイアログ（docs/screen-design.md 2章）。
 *
 * **F-04「誤操作を防ぐため、削除前に確認を求める」。** 削除は取り消せない——行ごと消える
 * 物理削除で、元に戻す手段を持っていない（docs/data-design.md 7章）。だから消す前に
 * 一度止める。この一手が、取り消し機能の代わりになっている。
 *
 * 作成（S-02）・編集（S-03）と同じく HTML 標準の `<dialog>`。prototype/index.html の
 * S-04 と同じ形で、外部ライブラリは使わない。
 *
 * **何を消すのかをタイトルで見せる。** 「本当に削除しますか？」だけだと、どのカードを
 * 開いていたか分からなくなったときに確かめようがない。
 */
export function TaskDeleteDialog({
  task,
  onDeleted,
  onClose,
}: {
  /** 削除するカード。タイトルの表示と、送る id の取り出し元 */
  task: Task
  /** 削除できたときに呼ぶ。App が一覧を取り直す */
  onDeleted: () => Promise<void>
  /** 閉じるときに呼ぶ */
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function handleDelete() {
    if (deleting) return
    setDeleteError(null)
    setDeleting(true)

    try {
      await deleteTask(task.id)
      await onDeleted()
      onClose()
    } catch (error: unknown) {
      // 作成・編集と同じで、失敗したら閉じない。閉じると何が起きたか分からないまま
      // ボードに戻り、消えたのか消えていないのかを利用者が判断できなくなる。
      setDeleteError(error instanceof Error ? error.message : String(error))
      setDeleting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="w-[min(24rem,calc(100vw-2rem))] rounded-xl p-0 backdrop:bg-slate-900/50"
    >
      <div className="px-5 py-4">
        <h2 className="text-base font-bold text-slate-900">このタスクを削除しますか？</h2>

        {/* 消す対象を見せる。長いタイトルでも枠からはみ出さないよう折り返す */}
        <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm break-words text-slate-700">
          「{task.title}」
        </p>

        <p className="mt-3 text-xs text-slate-500">削除すると元に戻せません。</p>

        {deleteError && (
          <div role="alert" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            {deleteError}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          やめる
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {deleting ? '削除中…' : '削除する'}
        </button>
      </div>
    </dialog>
  )
}
