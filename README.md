# TaskManagement

RaiseTech AIエンジニアコースの学習用リポジトリです。

## 概要
Git / GitHub / GitHub CLI(gh) の操作を習得するために作成しました。

## 学習環境
- Windows 11
- Cursor
- Git 2.49.0
- GitHub CLI 2.98.0
- JDK 25 (Temurin)
- Docker Desktop (WSL 2 backend)

## 起動手順

```
docker compose up -d          # PostgreSQL 18 を起動（healthy になるまで待つ場合は --wait）
cd backend
./gradlew bootRun             # http://localhost:8080
```

**`gradlew test` の前にも `docker compose up -d` が必要です。** JPA を入れたため、テストがデータベース接続を要求します（[理由](./docs/tech-stack.md)）。

停止するときは `bootRun` を Ctrl+C で止めてから `docker compose down`。データを消すなら `docker compose down -v`。

## 設計文書

`docs/` 配下。[要件定義書](./docs/requirements.md) が本体で、そこから機能要件・画面設計・データ設計・技術スタックに分かれています。