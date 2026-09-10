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

### サーバーの起動と停止は Claude が行う

**`gradlew bootRun` と `npm run dev` は Claude が起動し、Claude が止める。**

```powershell
docker compose up -d --wait          # PostgreSQL
cd backend;  ./gradlew bootRun       # 8080
cd frontend; npm run dev             # 5173
```

第11回に「開発者が自分のターミナルで起動する」と決めたが、第12回に実際に運用してみて
講義と同じ形に戻した（Issue #22）。**開発者にターミナルを打たせない。**

#### ⚠️ TaskStop では止まらない

**「止める手段が無い」という第11回の実測は取り消されていない。** 変わったのは、
ポートを掴んでいるプロセスを直接止める手段（`Stop-Process`）を Claude に渡したこと。

| 対象 | Claude の停止機能（TaskStop）の報告 | 実際に起きたこと |
|---|---|---|
| `gradlew bootRun` | Successfully stopped | **java が3本とも生存**（`java → java → java` の親子構造）。8080 は解放されず `curl` は HTTP 200 を返し続けた |
| `npm run dev` | Successfully stopped | **node が 5173 を掴んだまま生存** |

どちらも親プロセスだけが止まり、**ポートを掴んでいる子プロセスが残る**。
`TaskStop` の「Successfully stopped」を信用しない。**止めるときはこれを使う。**

```powershell
Stop-Process -Id (Get-NetTCPConnection -LocalPort 8080 -State Listen).OwningProcess
```

**Git Bash では動かない**（`Get-NetTCPConnection` は PowerShell のコマンド）。ポート番号を
5173 に変えればフロントにも使える。

**止めたと報告する前に、ポートが解放されたことを確認する。**

```powershell
Get-NetTCPConnection -LocalPort 8080 -State Listen
```

`taskkill` は deny に残してある。停止手段は1つで足りる。

### ポートは 8080 / 5173 で固定する。別のポートに逃がさない

**空いている別のポートで一時的に起動する、という回避をしない。** 古いサーバーが元のポートに
残ったまま新しいものが別ポートで動くと、「動いているのに変更が反映されない」状態になり、
原因の切り分けが難しくなる。

道具の側で既に強制してある。

- **フロント**：`frontend/vite.config.ts` の `server.strictPort: true`。5173 が埋まっていたら**起動を失敗させる**
- **バックエンド**：Spring Boot は 8080 が埋まっていると既定で起動に失敗する

**ポートが埋まっていたら、逃げずに掴んでいるプロセスを止める。**

### マージの前に bootRun と npm run dev を停止する

Windows では起動中の Gradle がファイルを掴んでいるため、`bootRun` を動かしたままブランチを
切り替えると `gradle-wrapper.jar` が削除できずに未追跡ファイルとして取り残され、
次の `git pull` が "untracked working tree files would be overwritten" で止まる。

**`gh pr merge` の前に、8080 と 5173 の両方が解放されていることを確認する。**
サーバーが2つになったので、止め忘れる機会も2つある。

Gradle のデーモンが残っている場合は `cd backend && ./gradlew --stop` で止められる
（これは deny 対象外の正規の停止コマンドなので Claude が実行してよい）。

### gradlew test の前に docker compose up -d

JPA が入っているためテストがデータベース接続を要求する。DB が起動していないとテストが落ちる。
Testcontainers も H2 も使わず、この運用ルールで対応している（理由は `docs/tech-stack.md`）。

**テストが `tasks` の中身を入れ替える問題は解決済み**（第12回）。`src/test/resources/application-test.properties`
に `spring.sql.init.mode=never` を置き、テストクラスに `@ActiveProfiles("test")` を付けてある。
**登録したタスクは `gradlew test` を実行しても消えない。**

テスト用の設定を足すときは、**`application.properties` という同じ名前で `src/test/resources` に
置かないこと。** クラスパスは test 側が先に来るため、main 側が丸ごと読まれなくなり、
データベースの接続先まで書き写すことになる。プロファイル名を付けた
`application-test.properties` は上書きとして働く（理由は `docs/api-design.md` 7章）。

### 破壊的なコマンドは禁止済み

`rm` / `git reset --hard` / `git clean` / `git push --force` などは `.claude/settings.json` の
deny リストに入れてある。回避しない。ファイルを消したいときは削除ではなく退避する。

## プロジェクト構成

| パス | 内容 |
|---|---|
| `docs/` | 設計文書。[`requirements.md`](docs/requirements.md) が本体で、そこから機能要件・画面設計・データ設計・API設計・技術スタックに分かれる（6文書） |
| `backend/` | Spring Boot 4.1.1 / Java 25 (Temurin) / Gradle (Groovy DSL) |
| `frontend/` | React 19 / TypeScript / Vite / Tailwind CSS 4。**表示と新規作成**（編集・削除・D&D は未実装） |
| `compose.yaml` | PostgreSQL 18 のコンテナ定義。ホストの `127.0.0.1:5432` に公開 |
| `prototype/index.html` | 第07回のプロトタイプ。HTML/CSS/JS 1ファイル、保存機能なし |

`backend/` と `frontend/` を同じリポジトリに置く構成を**モノレポ**という。両者は互いに
依存しないが、1つの機能を作るときは同時に触るため、判断材料を1か所に集めている。

**仕様の話はチャットの履歴ではなく `docs/` を読むこと。**

## 起動

手順は `.claude/skills/run-app/SKILL.md` にある（`/run-app` で呼べる）。**同じ内容を Skill にも
置いてあるのは、CLAUDE.md が長くなるほど個々のルールが読み飛ばされやすくなるため。**
起動・停止は事故が起きやすいので、必要な場面でだけ読み込まれる形にも複製してある。
