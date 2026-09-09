import type { Task } from './types'

/**
 * 状態コードごとの、次に何を確認すればいいかの案内。
 *
 * 番号の割り当ては推測ではなく実測にもとづく。
 *
 * - **502**：中継役の Vite が「転送先が居ない」と判断して返す。バックエンドの停止中に確認した
 * - **500**：バックエンドは応答しているが処理に失敗している。データベースのコンテナだけを
 *   止めた状態で確認したところ、接続を **30 秒** 待ってから 500 が返った
 *   （待ち時間は HikariCP の既定値。その間、画面は「読み込み中…」のまま止まる）
 */
function hintFor(status: number): string {
  if (status === 502) return 'バックエンドが起動しているか確認してください。'
  if (status >= 500) return 'バックエンドは応答していますが、処理に失敗しています。データベースが起動しているか確認してください。'
  return ''
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
    // Vite ごと落ちている場合など、HTTP の応答が返る前に fetch 自体が失敗する。
    throw new Error('サーバーに接続できませんでした。', { cause })
  }

  if (!response.ok) {
    throw new Error(`タスクを取得できませんでした（HTTP ${response.status}）。${hintFor(response.status)}`)
  }

  return response.json() as Promise<Task[]>
}
