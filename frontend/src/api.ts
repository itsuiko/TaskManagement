import type { Status, Task, TaskCreateInput, TaskUpdateInput } from './types'

/**
 * 状態コードごとの、次に何を確認すればいいかの案内。
 *
 * 番号の割り当ては推測ではなく実測にもとづく。
 *
 * - **400**：送った内容が受け付けられなかった。**本文に理由は入らない**ので、
 *   どの項目が悪いかはここでは分からない（docs/api-design.md 2.4）。
 *   画面に出す文言は入力欄のそばで自前に持つ
 * - **404**：対象のカードが無い。画面を開いたあとに、別のブラウザやタブでそのカードが
 *   削除されたときに起きる（docs/api-design.md 2.7）
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
 * 通信して、失敗を例外に直すところまでを 1 か所で行う。下の 5 つの関数すべてがここを通る。
 *
 * 第15回の品質チェックまでは、同じ十数行（fetch を try で囲む → `response.ok` を見る →
 * 文言を組み立てる）が 5 つの関数それぞれに書いてあった。**同じ判断が 5 か所にあると、
 * 直すときに 1 か所だけ直し忘れる。** 失敗の扱いを変えたくなったらここだけを直せばよい。
 *
 * 失敗は 2 種類ある。
 *
 * 1. **応答が返ってこない**（fetch 自体が例外を投げる）→ `connectionError`
 * 2. **応答は返ったが失敗を表す状態コード**（`response.ok` が false）→ `failure` に
 *    状態コードと `hintFor` の案内を付ける
 *
 * `fetch` は 2 の場合に例外を投げない。404 でも 500 でも「通信は成立した」として普通に
 * 返ってくるので、`response.ok` を見ないと失敗に気づけない。
 *
 * @param failure 失敗したときの文言の先頭。例：`'タスクを取得できませんでした'`
 */
async function request(path: string, failure: string, init?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(path, init)
  } catch (cause) {
    throw connectionError(cause)
  }

  if (!response.ok) {
    throw new Error(`${failure}（HTTP ${response.status}）。${hintFor(response.status)}`)
  }

  return response
}

/** JSON を本文として送るときの指定。POST / PUT / PATCH で共通 */
function jsonBody(method: 'POST' | 'PUT' | 'PATCH', body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
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
  const response = await request('/api/tasks', 'タスクを取得できませんでした')
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
  const response = await request('/api/tasks', 'タスクを登録できませんでした', jsonBody('POST', input))
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
  const response = await request(`/api/tasks/${id}`, 'タスクを更新できませんでした', jsonBody('PUT', input))
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
  const response = await request(
    `/api/tasks/${id}/status`,
    'タスクを移動できませんでした',
    jsonBody('PATCH', { status }),
  )
  return response.json() as Promise<Task>
}

/**
 * 1 件削除する（`DELETE /api/tasks/{id}`）。**行ごと消える物理削除で、元には戻せない。**
 *
 * **返ってくるのは 204 で、本文が無い。** だから `response.json()` を呼ばない。
 * 空の応答を JSON として読もうとすると、削除は成功しているのに例外になる。
 * 戻り値が `void` なのもそのため——サーバーから受け取るものが何も無い。
 *
 * **対象が無いときは 404 が返る**（docs/api-design.md 2.7）。別のブラウザで先に消されていた
 * 場合に起きる。`hintFor` の 404 の案内文がそのまま当てはまる。
 */
export async function deleteTask(id: number): Promise<void> {
  await request(`/api/tasks/${id}`, 'タスクを削除できませんでした', { method: 'DELETE' })
}
