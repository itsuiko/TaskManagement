# TaskManagement

Trello 風のカンバンボードで個人のタスクを管理する Web アプリケーション。

タスクを「カード」として扱い、**未着手 / 作業中 / 完了** の3列に並べる。データはブラウザ内ではなく、バックエンド API 経由で PostgreSQL に保存する。

RaiseTech AIエンジニアコースの学習課題として、**要件定義から実装までを一通り自分で通す**ことを目的に開発している。

## 現在できること

| 機能 | 状態 |
|---|---|
| ボード画面の表示（3列・件数・エラー表示） | **実装済み** |
| タスクの読み取り API（全件 / 1件 / status 絞り込み） | **実装済み** |
| データベースへの保存 | **実装済み**（読み取りのみ） |
| タスクの作成・編集・削除 | 未実装 |
| ドラッグ＆ドロップでの移動・並び替え | 未実装 |
| 列ごとのソート・並び順の取り消し | 未実装（要件のみ確定） |

**未実装のものはいずれも登録・更新・削除の API を必要とし、バックエンドは現在読み取りしか持たない**（[API設計書](./docs/api-design.md) 6章）。

## 技術スタック

| 層 | 採用 | バージョン |
|---|---|---|
| フロントエンド | React + TypeScript | 19.3.0 / 6.0.3 |
| ビルドツール | Vite | 8.2.2 |
| CSS | Tailwind CSS | 4.3.3 |
| 実行環境 | Node.js（LTS） / npm | 24.19.0 / 11.17.0 |
| バックエンド | Java（LTS） + Spring Boot | 25（Temurin 25.0.4.1）/ 4.1.1 |
| ビルドツール | Gradle（Groovy DSL） | 9.7.1 |
| データベース | PostgreSQL | 18（イメージ `postgres:18` の実体は 18.6） |
| コンテナ | Docker Desktop（WSL 2 backend） | Engine 29.7.2 / Compose 5.5.0 |

選定の理由と捨てた案は [技術スタック](./docs/tech-stack.md) にある。**講義の指定（Spring Boot 3系 / PostgreSQL 17）と数字が違うものがあり、それぞれ理由を記録している。**

## プロジェクト構成

```
TaskManagement/
├── backend/           Spring Boot（API）
├── frontend/          React（ボード画面）
├── docs/              設計文書 6本
├── prototype/         第07回の試作（HTML 1ファイル・保存なし）
├── compose.yaml       PostgreSQL 18
└── CLAUDE.md          開発フローと運用ルール
```

`backend/` と `frontend/` を同じリポジトリに置く構成を**モノレポ**という。両者は互いに依存しない（疎結合）が、1つの機能を作るときは同時に触るため、判断材料を1か所に集めている。

## 起動

**3つとも別々に起動する。** バックエンドとフロントエンドは、それぞれ別のターミナルで動かす。

```powershell
# 1. データベース
docker compose up -d --wait

# 2. バックエンド（別のターミナル）
cd backend
./gradlew bootRun            # http://localhost:8080

# 3. フロントエンド（さらに別のターミナル）
cd frontend
npm install                  # 初回のみ
npm run dev                  # http://localhost:5173
```

ブラウザで **http://localhost:5173** を開く。`backend/src/main/resources/data.sql` のテストデータ6件が、未着手3 / 作業中2 / 完了1 に分かれて表示される。

停止は各ターミナルで `Ctrl+C`。データベースは `docker compose down`（データも消すなら `-v`）。

### ポートは 8080 / 5173 で固定している

**埋まっていたら別のポートに逃げず、掴んでいるプロセスを止める。** 古いサーバーが元のポートに残ったまま新しいものが別ポートで動くと、「動いているのに変更が反映されない」状態になるため。フロントは `strictPort: true` を設定してあり、5173 が埋まっていると起動を失敗させる。

```powershell
# 8080 を掴んでいるプロセスを止める（PowerShell で実行。Git Bash では動かない）
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess
```

## API の動作確認

```powershell
curl.exe -s http://localhost:5173/api/tasks                  # フロント経由（プロキシ）
curl.exe -s http://localhost:8080/api/tasks                  # 全件
curl.exe -s http://localhost:8080/api/tasks/2                # 1件
curl.exe -s http://localhost:8080/api/tasks/status/todo      # status で絞り込み
curl.exe -s -o NUL -w "%{http_code}`n" http://localhost:8080/api/tasks/9999   # 404
```

**PowerShell では `curl` ではなく `curl.exe` と書く。** `curl` は `Invoke-WebRequest` の別名になっていて、`-s` などのオプションが通らない。

フロントとバックエンドはポートが違うため、そのまま呼ぶとブラウザが CORS で遮断する。Vite の `server.proxy` が `/api` を 8080 へ中継し、ブラウザからは同一オリジンに見えるようにしている。

## テスト

```powershell
docker compose up -d --wait     # 先にこれ
cd backend
./gradlew test
```

**JPA が入っているため、データベースが起動していないとテストが落ちる。** Testcontainers も H2 も使わず、この運用ルールで対応している（理由は [技術スタック](./docs/tech-stack.md) 6章）。

**`gradlew test` は `tasks` テーブルの中身を入れ替える。** テストが本番と同じデータベースに接続し、同じ設定ファイルを読むため `data.sql` が丸ごと走る。

## 設計文書

`docs/` 配下。**仕様の話はこちらが正で、実装が追いついていない箇所も明記してある。**

| 文書 | 内容 |
|---|---|
| [要件定義書](./docs/requirements.md) | **本体。** 概要・スコープ・非機能要件・完了条件19項目 |
| [機能要件・ユースケース](./docs/functional-requirements.md) | F-01〜F-10 / UC-01〜UC-08 |
| [画面設計書](./docs/screen-design.md) | S-01 ボード画面と3つのモーダル |
| [データ設計書](./docs/data-design.md) | ER図・`tasks` テーブル定義 |
| [API設計書](./docs/api-design.md) | エンドポイント一覧と、まだ無いために実装できない機能 |
| [技術スタック](./docs/tech-stack.md) | 採用理由と捨てた案 |

## 開発の進め方

Issue を立てる → ブランチを切る → 実装 → コミット → PR（本文に `Closes #番号`）→ レビューしてマージ。

**main への直接 push は GitHub 側のブランチ保護で禁止している**（管理者にも適用）。詳細は [CLAUDE.md](./CLAUDE.md)。

## 開発環境

| | |
|---|---|
| OS | Windows 11 |
| エディタ | Cursor |
| Git | 2.49.0 |
| GitHub CLI | 2.98.0 |
