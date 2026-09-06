# CLAUDE.md

このリポジトリで作業するときに必ず守るルール。

## 開発フロー

作業は必ずこの順で行う。手順を飛ばさない。

1. **Issue を立てる** — 何をするかを先に GitHub の Issue にする
2. **ブランチを切る** — `feature/#<Issue番号>-<短い説明>`
3. **実装する**
4. **コミットする**
5. **PR を作る** — 本文に `Closes #<Issue番号>` を書く
6. **レビューしてマージする**

## Git / GitHub のルール

### main ブランチへの直接プッシュは禁止

GitHub 側のブランチ保護で強制している（`enforce_admins: true`）。**管理者でも弾かれる。**
main への変更は必ず PR を経由する。

禁止されているのは push であって commit ではない。手元では main にコミットできてしまうので、
誤って main にコミットした場合は `git reset --soft HEAD~1` で取り消してからブランチを切り直す。

### ブランチ命名規則

`feature/#<Issue番号>-<短い説明>`

例：`feature/#10-github-rules`

### PR 本文に `Closes #<番号>` を書く

これを書くと、PR がマージされたときに対応する Issue が自動でクローズされる。

**ブランチ名の番号は Issue と紐づかない。** GitHub が見ているのは PR 本文のキーワードだけで、
ブランチ名の `#10` は人間が読むためのものである。

### マージ後のブランチは自動削除される

`delete_branch_on_merge: true` を設定済み。`gh pr merge` に `--delete-branch` を付けなくても
リモートのブランチは消える。ローカル側は残るので、マージ後に次を実行する。

```
git switch main && git pull && git fetch --prune
```

### コミットメッセージ

- **日本語**で書く
- 「何をしたか」ではなく **「なぜそうしたか」** を書く
- 例：`Docker で PostgreSQL 18 を立て、JPA で Spring Boot から接続`

## このリポジトリ固有の注意

### マージの前に bootRun を停止する

Windows では起動中の Gradle がファイルを掴んでいるため、`bootRun` を動かしたままブランチを
切り替えると `gradle-wrapper.jar` が削除できずに未追跡ファイルとして取り残され、
次の `git pull` が "untracked working tree files would be overwritten" で止まる。

**`gh pr merge` の前に Ctrl+C で停止する。**

### gradlew test の前に docker compose up -d

JPA が入っているためテストがデータベース接続を要求する。DB が起動していないとテストが落ちる。
Testcontainers も H2 も使わず、この運用ルールで対応している（理由は `docs/tech-stack.md`）。

### 破壊的なコマンドは禁止済み

`rm` / `git reset --hard` / `git clean` / `git push --force` などは `.claude/settings.json` の
deny リストに入れてある。回避しない。ファイルを消したいときは削除ではなく退避する。

## プロジェクト構成

| パス | 内容 |
|---|---|
| `docs/` | 設計文書。[`requirements.md`](docs/requirements.md) が本体で、そこから機能要件・画面設計・データ設計・技術スタックに分かれる |
| `backend/` | Spring Boot 4.1.1 / Java 25 (Temurin) / Gradle (Groovy DSL) |
| `compose.yaml` | PostgreSQL 18 のコンテナ定義。ホストの `127.0.0.1:5432` に公開 |
| `prototype/index.html` | 第07回のプロトタイプ。HTML/CSS/JS 1ファイル、保存機能なし |

**仕様の話はチャットの履歴ではなく `docs/` を読むこと。**

## 起動

```
docker compose up -d --wait     # PostgreSQL 18
cd backend && ./gradlew bootRun # http://localhost:8080
```
