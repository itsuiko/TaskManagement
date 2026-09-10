---
name: run-app
description: TaskManagement を起動・停止する手順。「アプリを起動して」「画面で確認したい」「サーバーを止めて」「ポートが埋まっている」「動いているのに変更が反映されない」と言われたとき、および実装を実機で確認する必要があるときに読む。
---

# TaskManagement の起動と停止

## 大前提：サーバーは Claude が起動し、Claude が止める

**`gradlew bootRun` と `npm run dev` は Claude が実行する。開発者にターミナルを打たせない。**

第11回に「開発者が起動する」と決めたが、第12回に講義と同じ形へ戻した（Issue #22）。

### ⚠️ ただし TaskStop では止まらない

**「止める手段が無い」という第11回の実測は取り消されていない。** 変わったのは、ポートを
掴んでいるプロセスを直接止める手段（`Stop-Process`）が deny から外れたこと。

| 対象 | TaskStop の報告 | 実際 |
|---|---|---|
| `gradlew bootRun` | Successfully stopped | java が3本とも生存し、8080 は解放されず HTTP 200 を返し続けた |
| `npm run dev` | Successfully stopped | node が 5173 を掴んだまま生存 |

どちらも親プロセスだけが止まり、**ポートを掴んでいる子プロセスが残る**。
**`TaskStop` の「Successfully stopped」を信用しない。** 停止は下記の手順で行い、
**止めたと報告する前に必ずポートの解放を確認する。**

## 起動の手順

### 1. データベース

```powershell
docker compose up -d --wait
```

`--wait` は healthy になるまで待つ。これを省くと、まだ受け付けられない状態でバックエンドが
接続しにいって失敗する。

**Docker Desktop 自体が落ちていると `docker compose` が
"failed to connect to the docker API" で失敗する。** PC の再起動やスリープの後に起きる。
その場合は開発者に起動を頼む（GUI アプリなので Claude からは起動しない）。

```powershell
Start-Process "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe"
```

### 2. バックエンド

```powershell
cd backend
./gradlew bootRun
```

`Started TaskManagementApplication` が出れば起動完了。http://localhost:8080

**起動すると `data.sql` が走り、`tasks` の中身が6件に戻る**（`spring.sql.init.mode=always`）。
残したいデータがあるときは先に退避する。**テストでは走らない**（下記）。

### 3. フロントエンド（別のターミナルで）

```powershell
cd frontend
npm run dev
```

http://localhost:5173

**バックエンドが動いていないとカードは表示されない。** 画面は自分でデータを持たず、
`GET /api/tasks` の結果を表示するだけ。

## 停止

**ポートを掴んでいるプロセスを直接止める。**

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173 -State Listen).OwningProcess
```

**PowerShell で実行すること。Git Bash では動かない**（`Get-NetTCPConnection` は PowerShell の
コマンドなので `command not found` になる）。

**止まったことを必ず確認する。**

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen
```

何も返らなければ解放されている。`taskkill` は deny のまま。停止手段は1つで足りる。

**1本止めれば足りる（実測）。** 第11回に「java が3本生きていた」と記録したが、`Stop-Process` で
**ポートを掴んでいる末端の java を止めると、それを起動していた Gradle デーモンも一緒に終了し、
8080 は解放される**。3本を順に追いかける必要はない。

ただし**別のビルドで使われていた IDLE の Gradle デーモンは残る**。これは害がなく（次のビルドが
速くなる）、放置してよい。気になるときは：

```powershell
cd backend; ./gradlew --status   # 残っているデーモンを見る
cd backend; ./gradlew --stop     # 止める
```

データベースは `docker compose down`。

## ポートは 8080 / 5173 で固定する

**空いている別のポートに逃がさない。** 古いサーバーが元のポートに残ったまま新しいものが
別ポートで動くと、**「動いているのに変更が反映されない」**状態になり、原因の切り分けが
難しくなる。

道具の側で既に強制してある。

- **フロント**：`frontend/vite.config.ts` の `server.strictPort: true` — 5173 が埋まっていたら起動を失敗させる
- **バックエンド**：Spring Boot は 8080 が埋まっていると既定で起動に失敗する

**ポートが埋まっていたら、逃げずに掴んでいるプロセスを止める。** 何が掴んでいるかは
これで調べられる。

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen | ForEach-Object { Get-Process -Id $_.OwningProcess }
```

## 動作確認

```powershell
curl.exe -s http://localhost:5173/api/tasks    # プロキシ経由。JSON が返ればフロント↔バックが繋がっている
curl.exe -s http://localhost:8080/api/tasks    # バックエンドに直接
```

**PowerShell では `curl` ではなく `curl.exe`。** `curl` は `Invoke-WebRequest` の別名になっていて
`-s` などのオプションが通らない。

### 日本語を含む POST は PowerShell から送る（実測）

```powershell
curl.exe -s -X POST http://localhost:8080/api/tasks -H "Content-Type: application/json" -d '{"title":"買い出しに行く","priority":"high"}'
```

- **Git Bash から同じ内容を `-d` で渡すと文字コードが壊れて 400 になる。** ファイル
  （`--data-binary @body.json`）から渡せば Git Bash でも通る
- **PowerShell 7 では JSON の `"` をバックスラッシュで打ち消さない。** `\"` と書くと
  バックスラッシュごと `curl.exe` に渡って JSON が壊れる（5.1 とは逆）

### エラーが出たときの読み方

画面に出る状態コードで原因が分かれる（実測）。

| 状態コード | 原因 | 待ち時間 |
|---|---|---|
| **502** | バックエンドが起動していない（中継役の Vite が返す） | 即座 |
| **500** | バックエンドは動いているが、データベースに繋がらない | **30秒**（接続待ちの既定値。その間、画面は「読み込み中…」のまま） |
| **400** | 入力が不正（POST）。**本文に理由は入らない**ので、どの項目が悪いかは分からない | 即座 |

`bootRun` のログに `Connection refused: getsockopt` が出て起動に失敗する場合は、
**データベースが動いていない**。その後の大量のスタックトレースと
`Unable to determine Dialect` は原因ではなく結果。

## テストを実行するとき

```powershell
docker compose up -d --wait     # 先にこれ。JPA が入っているため DB が無いとテストが落ちる
cd backend; ./gradlew test
```

**テストは `tasks` の中身を消さない**（Issue #20 で対処済み）。
`src/test/resources/application-test.properties` の `spring.sql.init.mode=never` と
`@ActiveProfiles("test")` により、テスト時だけ `data.sql` が実行されない。

**消えるのは `bootRun` したとき。** 起動とテストで挙動が違う。

## マージの前に必ず止める

**`gh pr merge` の前に、8080 と 5173 の両方が解放されていることを確認する。**

Windows では起動中の Gradle がファイルを掴んでいるため、動かしたままブランチを切り替えると
`gradle-wrapper.jar` が削除できずに未追跡ファイルとして残り、次の `git pull` が
"untracked working tree files would be overwritten" で止まる。
