export type Status = 'todo' | 'doing' | 'done'
export type Priority = 'high' | 'medium' | 'low'

/**
 * バックエンドが返す 1 件のタスク。
 *
 * キーがキャメルケース（`due_date` ではなく `dueDate`）なのは、Spring Boot 既定の
 * 命名戦略が DB の列名から変換しているため。形は docs/api-design.md 3章が元。
 */
export type Task = {
  id: number
  title: string
  description: string | null
  dueDate: string | null // "2026-09-12" 形式。時刻を持たない
  priority: Priority | null
  status: Status
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/**
 * 画面上の 3 列。並びはボードの表示順（未着手 → 作業中 → 完了）で固定する。
 *
 * `GET /api/tasks` の並びは status のアルファベット順（doing → done → todo）で、
 * ボードの表示順とは一致しない。画面側がこの順で振り分けるため実害はない
 * （docs/api-design.md 2.1）。
 */
export const COLUMNS: { status: Status; label: string }[] = [
  { status: 'todo', label: '未着手' },
  { status: 'doing', label: '作業中' },
  { status: 'done', label: '完了' },
]

export const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}

/**
 * `POST /api/tasks` に送る内容（docs/api-design.md 2.4）。
 *
 * バックエンドの `TaskCreateRequest` と対になる形で、**Task から項目を削っただけの型にしない**。
 * `id` / `createdAt` / `updatedAt` / `sortOrder` はサーバーが決めるので送る先が無い。
 * ここに無い値を送っても、受け取る側に入り口が無い。
 *
 * 未入力は `null` で送る。空文字で送ると「空文字が入力された」ことになり、
 * 「入力されなかった」と区別がつかない。
 */
export type TaskCreateInput = {
  title: string
  description: string | null
  dueDate: string | null
  priority: Priority | null
  status: Status
}

/**
 * `PUT /api/tasks/{id}` に送る内容（docs/api-design.md 2.5）。
 *
 * 項目は `TaskCreateInput` と同じだが、**別の型として置いている**。同じに見えるのは
 * 今の仕様がそうなっているだけで、送り先も意味も違う（新しく作る／既にあるものを置き換える）。
 * 片方をなぞった型にすると、一方に項目が増えたときにもう一方も黙って変わる。
 *
 * **`status` は登録と違って必ず送る。** 省略すると「省略されたら `todo`」という *登録時* の
 * 判断が働き、作業中のカードを保存しただけで未着手に戻る（docs/api-design.md 2.5）。
 */
export type TaskUpdateInput = {
  title: string
  description: string | null
  dueDate: string | null
  priority: Priority | null
  status: Status
}
