import type { Status, Task, TaskCreateInput, TaskUpdateInput } from './types'

/**
 * 状態コードごとの、次に何を確認すればいいかの案内。
 *
 * 番号の割り当ては推測ではなく実測にもとづく。
 *
 * - **400**：送った内容が受け付けられなかった。**本文に理由は入らない**ので、
 *   どの項目が悪いかはここでは分からない（docs/api-design.md 2.4）。
 *   画面に出す文言は入力欄のそばで自前に持つ
 * - **404**：対象のカードが無い。`bootRun` のたびに `data.sql` が走って id が振り直されるため、
 *   画面を開いたままバックエンドを入れ直すと起きる（docs/api-design.md 2.5）
 * - **502**：中継役の Vite が「転送先が居ない」と判断して返す。バックエンドの停止中に確認した
 * - **500**：バックエンドは応答しているが処理に失敗している。データベースのコンテナだけを
 *   止めた状態で確認したところ、接続を **30 秒** 待ってから 500 が返った
 *   （待ち時間は HikariCP の既定値。その間、画面は「読み込み中…」のまま止まる）
 */
function hintFor(status: number): string {
  if (status === 400) return '入力内容を確認してください。'
  if (status === 404) return 'この画面を開いたあとに、そのタスクが無くなった可能性があります。再読み込みしてください。'
  if (status === 502) return 'バックエンドが起動しているか確認してください。'
  if (status >= 500) return 'バックエンドは応答していますが、処理に失敗しています。データベースが起動しているか確認してください。'
  return ''
}

/**
 * 通信そのものが成立しなかったときの例外。
 *
 * HTTP の応答が返る前に fetch が失敗する場合（Vite ごと落ちているなど）に投げる。
 * 状態コードが無いので hintFor は使えない。
 */
function connectionError(cause: unknown): Error {
  return new Error('サーバーに接続できませんでした。', { cause })
}

/**
 * 全件を取得する（`GET /api/tasks`）。
 *
 * パスを `/api/tasks` と相対で書いているのは、Vite の server.proxy が
 * `http://localhost:8080` へ中継するため（vite.config.ts）。
 * ここに `http://localhost:8080` と直接書くと別オリジンになり CORS で弾かれる。
 *
 * `/api/tasks/status/{status}` は使わない。3 列に分けるのは画面側の仕事で、
 * 全件を 1 回取れば足りる（通信を 3 回に増やす理由がない）。
 */
export async function fetchTasks(): Promise<Task[]> {
  let response: Response
  try {
    response = await fetch('/api/tasks')
  } catch (cause) {
    throw connectionError(cause)
  }

  if (!response.ok) {
    throw new Error(`タスクを取得できませんでした（HTTP ${response.status}）。${hintFor(response.status)}`)
  }

  return response.json() as Promise<Task[]>
}

/**
 * 1 件登録する（`POST /api/tasks`）。成功すると 201 と、作成された Task が返る。
 *
 * 返ってきた Task には `id` と `sortOrder` が入っている。どちらもサーバーが決めるので、
 * 送った側は返事を見るまでその値を知らない（docs/api-design.md 2.4）。
 *
 * **タイトルが空かどうかは呼ぶ前に画面側で確かめる。** ここへ来てしまうと 400 で弾かれるが、
 * 本文に理由が入らないため「タイトルが空だった」と伝え直せない。
 */
export async function createTask(input: TaskCreateInput): Promise<Task> {
  let response: Response
  try {
    response = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch (cause) {
    throw connectionError(cause)
  }

  if (!response.ok) {
    throw new Error(`タスクを登録できませんでした（HTTP ${response.status}）。${hintFor(response.status)}`)
  }

  return response.json() as Promise<Task>
}

/**
 * 1 件の内容を書き換える（`PUT /api/tasks/{id}`）。成功すると 200 と、更新後の Task が返る。
 *
 * **PUT は「この URL の中身をこれにする」という操作**なので、送らなかった項目は空になる。
 * 説明文を消したいときは `null` を送る（docs/api-design.md 2.5）。
 *
 * 登録と同じく、**タイトルが空かどうかは呼ぶ前に画面側で確かめる。** ここへ来ると 400 で
 * 弾かれるが、本文に理由が入らないため「タイトルが空だった」と伝え直せない。
 */
export async function updateTask(id: number, input: TaskUpdateInput): Promise<Task> {
  let response: Response
  try {
    response = await fetch(`/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
  } catch (cause) {
    throw connectionError(cause)
  }

  if (!response.ok) {
    throw new Error(`タスクを更新できませんでした（HTTP ${response.status}）。${hintFor(response.status)}`)
  }

  return response.json() as Promise<Task>
}

/**
 * 状態だけを変える（`PATCH /api/tasks/{id}/status`）。カードを別の列にドロップしたときに呼ぶ。
 *
 * **送るのは `status` ひとつだけ。** 同じことは `updateTask` でもできるが、カードを 1 枚
 * 動かすたびにタイトルも説明文も期限も送ることになる。画面上の位置が決めているのは
 * `status` だけなので、送る先も `status` だけにしてある（docs/api-design.md 2.6）。
 *
 * **移動先での並び順は送らない。** サーバーが移動先の列の末尾に採番する。
 */
export async function updateTaskStatus(id: number, status: Status): Promise<Task> {
  let response: Response
  try {
    response = await fetch(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
  } catch (cause) {
    throw connectionError(cause)
  }

  if (!response.ok) {
    throw new Error(`タスクを移動できませんでした（HTTP ${response.status}）。${hintFor(response.status)}`)
  }

  return response.json() as Promise<Task>
}
