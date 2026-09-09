---
name: run-app
description: TaskManagement を起動・停止する手順。「アプリを起動して」「画面で確認したい」「サーバーを止めて」「ポートが埋まっている」「動いているのに変更が反映されない」と言われたとき、および実装を実機で確認する必要があるときに読む。
---

# TaskManagement の起動と停止

## 大前提：サーバーは Claude が起動しない

**`gradlew bootRun` と `npm run dev` は開発者が自分のターミナルで実行する。** Claude は
コマンドを提示するだけで、自分では起動しない。

理由は **Claude 側に停止する手段が無いこと**。実測で確認済み。

| 対象 | TaskStop の報告 | 実際 |
|---|---|---|
| `gradlew bootRun` | Successfully stopped | java が3本とも生存し、8080 は解放されず HTTP 200 を返し続けた |
| `npm run dev` | Successfully stopped | node が 5173 を掴んだまま生存 |

どちらも親プロセスだけが止まり、**ポートを掴んでいる子プロセスが残る**。
`Stop-Process` / `taskkill` は `.claude/settings.json` の deny リストにあり、回避しない。

**例外：データベース（`docker compose`）は Claude が実行してよい。** `docker compose down`
という正規の停止手段があるため。

## 起動の手順

### 1. データベース（Claude が実行してよい）

```powershell
docker compose up -d --wait
```

`--wait` は healthy になるまで待つ。これを省くと、まだ受け付けられない状態でバックエンドが
接続しにいって失敗する。

### 2. バックエンド（開発者が実行）

```powershell
cd backend
./gradlew bootRun
```

`Started TaskManagementApplication` が出れば起動完了。http://localhost:8080

### 3. フロントエンド（開発者が実行。別のターミナルで）

```powershell
cd frontend
npm run dev
```

http://localhost:5173

**バックエンドが動いていないとカードは表示されない。** 画面は自分でデータを持たず、
`GET /api/tasks` の結果を表示するだけ。

## 停止

**開発者が各ターミナルで `Ctrl+C`。**

Gradle のデーモンが残っている場合のみ、Claude が実行してよい：

```powershell
cd backend; ./gradlew --stop
```

## ポートは 8080 / 5173 で固定する

**空いている別のポートに逃がさない。** 古いサーバーが元のポートに残ったまま新しいものが
別ポートで動くと、**「動いているのに変更が反映されない」**状態になり、原因の切り分けが
難しくなる。

道具の側で既に強制してある。

- **フロント**：`frontend/vite.config.ts` の `server.strictPort: true` — 5173 が埋まっていたら起動を失敗させる
- **バックエンド**：Spring Boot は 8080 が埋まっていると既定で起動に失敗する

### ポートが埋まっているとき

Claude は**どのプロセスが掴んでいるかまでを調べて提示する**（これは読み取りなので実行してよい）。

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }
```

止めるのは開発者：

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess
```

**PowerShell で実行すること。Git Bash では動かない**（`Get-NetTCPConnection` は PowerShell の
コマンドなので `command not found` になる）。ポート番号を 5173 に変えればフロントにも使える。

## 動作確認

Claude が実行してよいのは読み取りだけ。

```powershell
curl.exe -s http://localhost:5173/api/tasks    # プロキシ経由。JSON が返ればフロント↔バックが繋がっている
curl.exe -s http://localhost:8080/api/tasks    # バックエンドに直接
```

**PowerShell では `curl` ではなく `curl.exe`。** `curl` は `Invoke-WebRequest` の別名になっていて
`-s` などのオプションが通らない。

### エラーが出たときの読み方

画面に出る状態コードで原因が分かれる（実測）。

| 状態コード | 原因 | 待ち時間 |
|---|---|---|
| **502** | バックエンドが起動していない（中継役の Vite が返す） | 即座 |
| **500** | バックエンドは動いているが、データベースに繋がらない | **30秒**（接続待ちの既定値。その間、画面は「読み込み中…」のまま） |

## テストを実行するとき

```powershell
docker compose up -d --wait     # 先にこれ。JPA が入っているため DB が無いとテストが落ちる
cd backend; ./gradlew test
```

**`gradlew test` は `tasks` テーブルの中身を入れ替える。** テストが本番と同じデータベースに
接続し、同じ `application.properties` を読むため `data.sql`（`DELETE` → `INSERT`）が丸ごと走る。
残したいデータがあるときは先に退避する。

## マージの前に必ず止める

**`gh pr merge` の前に、バックエンドとフロントを両方 `Ctrl+C` で止める。**

Windows では起動中の Gradle がファイルを掴んでいるため、動かしたままブランチを切り替えると
`gradle-wrapper.jar` が削除できずに未追跡ファイルとして残り、次の `git pull` が
"untracked working tree files would be overwritten" で止まる。
