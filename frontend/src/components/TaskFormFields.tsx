import { PRIORITY_LABELS, type Priority } from '../types'
import type { TaskFormValues } from '../taskForm'

/**
 * S-02 作成モーダルと S-03 編集モーダルが共有する入力欄（docs/screen-design.md 2章）。
 *
 * 第12回に作成モーダルを作ったときは「使う先が決まらないうちに共通化しない」として
 * 作成専用にしていた。編集という2つ目の使い先が出たので切り出している。
 *
 * **切り出したのは入力欄だけで、送信は各モーダルが持つ。** 送る先（POST か PUT か）も、
 * 送ったあとの処理も違う。そこまで持たせると、この中で「作成か編集か」を分岐することになる。
 *
 * **値は親が持つ。** 1 つのオブジェクトと `onChange` 1 つを渡す形にしてあるのは、
 * 項目ごとに setter を渡すと引数が 4 つ並び、項目を足すたびに増えるため。
 */
export function TaskFormFields({
  values,
  onChange,
  titleError,
}: {
  values: TaskFormValues
  /** 変えたい項目だけを渡す。例：`onChange({ title: '買い出し' })` */
  onChange: (patch: Partial<TaskFormValues>) => void
  /** タイトルが空のときに出す文言。`null` なら出さない */
  titleError: string | null
}) {
  return (
    <>
      <div>
        <label htmlFor="f-title" className="mb-1 block text-sm font-medium text-slate-700">
          タイトル <span className="text-rose-600">＊</span>
        </label>
        <input
          id="f-title"
          type="text"
          value={values.title}
          onChange={(e) => onChange({ title: e.target.value })}
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
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
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
            value={values.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="f-priority" className="mb-1 block text-sm font-medium text-slate-700">
            優先度
          </label>
          <select
            id="f-priority"
            value={values.priority}
            onChange={(e) => onChange({ priority: e.target.value as Priority | '' })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:ring-1 focus:ring-sky-500 focus:outline-none"
          >
            <option value="">未指定</option>
            <option value="high">{PRIORITY_LABELS.high}</option>
            <option value="medium">{PRIORITY_LABELS.medium}</option>
            <option value="low">{PRIORITY_LABELS.low}</option>
          </select>
        </div>
      </div>
    </>
  )
}
